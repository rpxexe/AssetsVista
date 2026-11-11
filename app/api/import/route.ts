import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbconnect from "@/lib/dbconnect";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { IMPORT_ENTITY_SCHEMAS, ImportEntityType } from "@/lib/importSchemas";
import { getAuthenticatedActor, requirePermission } from "@/lib/serverAuth";
import { AccessoriesModel } from "@/models/Accessories.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import ImportJobModel from "@/models/ImportJob.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";

const MAX_ROWS_PER_IMPORT = 2000;

type PrimitiveCell = string | number | boolean | null | undefined;
type MappedImportRow = Record<string, PrimitiveCell>;

export interface RowSimulationResult {
  rowNumber: number;
  identifier: string;
  action: "create" | "update" | "skip" | "error";
  summary: string;
  errors: string[];
  notes: string[];
  raw: MappedImportRow;
}

const EMPTY_PLACEHOLDERS = new Set(["-", "--", "n/a", "na", "null", "none"]);
const UNASSIGNED_PLACEHOLDERS = new Set([
  "-",
  "--",
  "n/a",
  "na",
  "null",
  "none",
  "unassigned",
  "available",
  "not assigned",
  "in stock",
  "unallocated",
]);

function asTrimmedString(val: PrimitiveCell): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function asCleanOptionalString(val: PrimitiveCell): string {
  const s = asTrimmedString(val);
  if (!s || EMPTY_PLACEHOLDERS.has(s.toLowerCase())) return "";
  return s;
}

function resolveAssigneePerson(
  rawVal: PrimitiveCell,
  personByEmail: Map<string, any>,
  personByUsername: Map<string, any>,
  personByName: Map<string, any>
): {
  status: "empty" | "explicit_unassigned" | "matched" | "ambiguous" | "missing";
  person?: any;
  displayLabel?: string;
  raw?: string;
} {
  const clean = asTrimmedString(rawVal);
  if (!clean) return { status: "empty" };
  const lower = clean.toLowerCase();
  if (UNASSIGNED_PLACEHOLDERS.has(lower)) {
    return { status: "explicit_unassigned" };
  }

  const byDirectKey = personByEmail.get(lower) || personByUsername.get(lower);
  if (byDirectKey) {
    return { status: "matched", person: byDirectKey, displayLabel: clean };
  }

  // Handle "Full Name (email@domain.com)" or "Full Name <email@domain.com>"
  const bracketMatch = /[(<]([^)>]+)[)>]/.exec(clean);
  if (bracketMatch?.[1]) {
    const inner = bracketMatch[1].trim().toLowerCase();
    const byInner = personByEmail.get(inner) || personByUsername.get(inner);
    if (byInner) {
      return { status: "matched", person: byInner, displayLabel: clean };
    }
  }

  const byName = personByName.get(lower);
  if (byName === "AMBIGUOUS") {
    return { status: "ambiguous", raw: clean };
  }
  if (byName) {
    return { status: "matched", person: byName, displayLabel: clean };
  }

  return { status: "missing", raw: clean };
}

function parseImportNumber(val: PrimitiveCell): { value: number | undefined; error?: string } {
  const str = asCleanOptionalString(val);
  if (!str) return { value: undefined };
  const cleaned = str.replace(/[$,\s]/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    return { value: undefined, error: `Invalid numeric value "${str}"` };
  }
  return { value: num };
}

function parseImportDate(val: PrimitiveCell): { value: Date | undefined; error?: string } {
  if (val === null || val === undefined || val === "") return { value: undefined };
  if (typeof val === "number" && Number.isFinite(val) && val > 20000 && val < 90000) {
    // Handle Excel serial date numbers (epoch 1899-12-30)
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return { value: d };
  }
  const str = asCleanOptionalString(val);
  if (!str) return { value: undefined };
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    return { value: undefined, error: `Invalid date "${str}"` };
  }
  return { value: parsed };
}

function parseImportBoolean(val: PrimitiveCell, fallback = false): boolean {
  if (typeof val === "boolean") return val;
  const s = asTrimmedString(val).toLowerCase();
  if (!s) return fallback;
  return ["true", "1", "yes", "y", "on"].includes(s);
}

function inferStatusType(name: string): "deployable" | "pending" | "undeployable" | "archived" {
  const s = name.toLowerCase();
  if (s.includes("archiv")) return "archived";
  if (s.includes("pend") || s.includes("repair")) return "pending";
  if (s.includes("undeploy") || s.includes("broken") || s.includes("lost")) return "undeployable";
  return "deployable";
}

function isPlaceholderId(id?: string): boolean {
  return Boolean(id && id.startsWith("__pending__"));
}

async function buildTaxonomyResolver(args: {
  workspaceId: string;
  isDryRun: boolean;
  autoCreateTaxonomy: boolean;
}) {
  const { workspaceId, isDryRun, autoCreateTaxonomy } = args;
  const scope = { userId: workspaceId };

  const [
    companies,
    locations,
    departments,
    categories,
    statuses,
    assetModels,
    manufacturers,
    suppliers,
  ] = await Promise.all([
    CompanyModel.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
    LocationModel.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
    DepartmentModel.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
    CategoryModel.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
    StatusModel.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
    AssetModel_Model.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
    ManufacturerModel.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
    SupplierModel.find(scope).select("_id name").lean<Array<{ _id: unknown; name: string }>>(),
  ]);

  const toMap = (docs: Array<{ _id: unknown; name: string }>) => {
    const m = new Map<string, string>();
    for (const d of docs) {
      if (d.name) m.set(d.name.trim().toLowerCase(), String(d._id));
    }
    return m;
  };

  const maps = {
    company: toMap(companies),
    location: toMap(locations),
    department: toMap(departments),
    category: toMap(categories),
    status: toMap(statuses),
    assetModel: toMap(assetModels),
    manufacturer: toMap(manufacturers),
    supplier: toMap(suppliers),
  };

  const autoCreatedLabels: string[] = [];
  const autoCreatedKeys = new Set<string>();

  const recordCreation = (label: string) => {
    if (!autoCreatedKeys.has(label)) {
      autoCreatedKeys.add(label);
      autoCreatedLabels.push(label);
    }
  };

  async function resolveSimple(
    kind: keyof typeof maps,
    rawName: string,
    createFn: (name: string) => Promise<string>
  ): Promise<{ id?: string; error?: string; createdName?: string }> {
    const clean = rawName.trim();
    if (!clean || EMPTY_PLACEHOLDERS.has(clean.toLowerCase())) return {};
    const key = clean.toLowerCase();
    const hit = maps[kind].get(key);
    if (hit) return { id: hit };

    if (!autoCreateTaxonomy) {
      return { error: `Unknown ${kind} "${clean}" (enable Auto-Create Taxonomy or create it first)` };
    }

    const label = `${kind}: ${clean}`;
    recordCreation(label);

    if (isDryRun) {
      const virtualId = `__pending__${kind}__${key}`;
      maps[kind].set(key, virtualId);
      return { id: virtualId, createdName: label };
    }

    const createdId = await createFn(clean);
    maps[kind].set(key, createdId);
    return { id: createdId, createdName: label };
  }

  const ensureCompany = (name: string) =>
    resolveSimple("company", name, async (n) => {
      const doc = await CompanyModel.create({
        userId: workspaceId,
        name: n,
        email: "contact@assetsvista.local",
      });
      return doc._id.toString();
    });

  const ensureLocation = (name: string) =>
    resolveSimple("location", name, async (n) => {
      const doc = await LocationModel.create({
        userId: workspaceId,
        name: n,
      });
      return doc._id.toString();
    });

  const ensureCategory = (name: string, typeHint = "asset") =>
    resolveSimple("category", name, async (n) => {
      const doc = await CategoryModel.create({
        userId: workspaceId,
        name: n,
        type: typeHint,
        email: false,
      });
      return doc._id.toString();
    });

  const ensureStatus = (name: string) =>
    resolveSimple("status", name, async (n) => {
      const doc = await StatusModel.create({
        userId: workspaceId,
        name: n,
        type: inferStatusType(n),
      });
      return doc._id.toString();
    });

  const ensureManufacturer = (name: string) =>
    resolveSimple("manufacturer", name, async (n) => {
      const doc = await ManufacturerModel.create({
        userId: workspaceId,
        name: n,
        url: "https://example.com",
        support_url: "https://example.com/support",
        support_phone: "000-000-0000",
        support_email: "support@assetsvista.local",
      });
      return doc._id.toString();
    });

  const ensureSupplier = (name: string) =>
    resolveSimple("supplier", name, async (n) => {
      const doc = await SupplierModel.create({
        userId: workspaceId,
        name: n,
        address: "Unspecified",
        contact_name: n,
        email: "vendor@assetsvista.local",
        phone: "000-000-0000",
      });
      return doc._id.toString();
    });

  const ensureDepartment = async (
    name: string,
    preferredLocationName?: string,
    preferredCompanyId?: string
  ) => {
    return resolveSimple("department", name, async (n) => {
      let locationId = preferredLocationName
        ? (await ensureLocation(preferredLocationName)).id
        : undefined;
      if (!locationId) {
        const firstLoc = Array.from(maps.location.values()).find((v) => !isPlaceholderId(v));
        locationId = firstLoc || (await ensureLocation("Main Office")).id;
      }
      const doc = await DepartmentModel.create({
        userId: workspaceId,
        name: n,
        location: locationId,
        ...(preferredCompanyId && !isPlaceholderId(preferredCompanyId)
          ? { company: preferredCompanyId }
          : {}),
      });
      return doc._id.toString();
    });
  };

  const ensureAssetModel = async (name: string, preferredCategoryName?: string) => {
    return resolveSimple("assetModel", name, async (n) => {
      const catRes = await ensureCategory(preferredCategoryName || "General Assets", "asset");
      const doc = await AssetModel_Model.create({
        userId: workspaceId,
        name: n,
        model_no: n,
        category: catRes.id,
        eol_rate: 36,
      });
      return doc._id.toString();
    });
  };

  return {
    ensureCompany,
    ensureLocation,
    ensureCategory,
    ensureStatus,
    ensureManufacturer,
    ensureSupplier,
    ensureDepartment,
    ensureAssetModel,
    autoCreatedLabels,
  };
}

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    if (
      !actor.permissions.canCreateEditAssets &&
      !actor.permissions.canManagePeople &&
      !actor.permissions.canManageSettings
    ) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Insufficient permissions to view imports." },
        { status: 403 }
      );
    }

    await dbconnect();
    const history = await ImportJobModel.find({ userId: actor.workspaceId })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    return NextResponse.json({ success: true, data: history }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch import history:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load import history" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requirePermission(
      "canCreateEditAssets",
      "You do not have permission to manage import history."
    );
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid Import Job ID is required." },
        { status: 400 }
      );
    }

    await dbconnect();
    await ImportJobModel.findOneAndDelete({
      _id: id,
      userId: authResult.actor.workspaceId,
    });

    return NextResponse.json(
      { success: true, message: "Import log deleted." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete import job:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete import history record" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      entityType?: unknown;
      mode?: unknown;
      updateExisting?: unknown;
      preserveBlanks?: unknown;
      autoCreateTaxonomy?: unknown;
      skipInvalidRows?: unknown;
      filename?: unknown;
      fileFormat?: unknown;
      rows?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const rawEntity = String(body.entityType || "").trim() as ImportEntityType;
    const schema = IMPORT_ENTITY_SCHEMAS[rawEntity];
    if (!schema) {
      return NextResponse.json(
        { success: false, message: "Unsupported import entity type." },
        { status: 400 }
      );
    }

    const authResult = await requirePermission(
      schema.permissionKey,
      `Your role does not permit importing ${schema.pluralLabel}.`
    );
    if ("error" in authResult) return authResult.error;
    const { actor } = authResult;
    const workspaceId = actor.workspaceId;

    const mode = body.mode === "commit" ? "commit" : "dry_run";
    const isDryRun = mode === "dry_run";
    const updateExisting = body.updateExisting !== false;
    const preserveBlanks = body.preserveBlanks !== false;
    const autoCreateTaxonomy = body.autoCreateTaxonomy !== false;
    const skipInvalidRows = body.skipInvalidRows !== false;
    const filename = asTrimmedString(body.filename as PrimitiveCell) || "import.csv";
    const rawFormat = asTrimmedString(body.fileFormat as PrimitiveCell).toLowerCase();
    const fileFormat: "csv" | "xlsx" | "xls" =
      rawFormat === "xlsx" || rawFormat === "xls" ? rawFormat : "csv";

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "No data rows supplied to process." },
        { status: 400 }
      );
    }

    if (body.rows.length > MAX_ROWS_PER_IMPORT) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum ${MAX_ROWS_PER_IMPORT} rows allowed per batch.`,
        },
        { status: 400 }
      );
    }

    await dbconnect();
    const resolver = await buildTaxonomyResolver({
      workspaceId,
      isDryRun,
      autoCreateTaxonomy,
    });

    const scope = { userId: workspaceId };
    const results: RowSimulationResult[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Preload lookup indices for fast duplicate detection and upserts
    const assetByTag = new Map<string, any>();
    const assetBySerial = new Map<string, string>();
    const personByUsername = new Map<string, any>();
    const personByEmail = new Map<string, any>();
    const personByName = new Map<string, any>();
    const licenseByName = new Map<string, any>();
    const accessoryByName = new Map<string, any>();
    const consumableByName = new Map<string, any>();
    const componentByName = new Map<string, any>();
    const locationByName = new Map<string, any>();
    const supplierByName = new Map<string, any>();
    const categoryByName = new Map<string, any>();

    if (rawEntity === "asset") {
      const existingAssets = await AssetModel.find(scope)
        .select("_id asset_tag serial_number")
        .lean<Array<{ _id: unknown; asset_tag: string; serial_number: string }>>();
      for (const a of existingAssets) {
        if (a.asset_tag) assetByTag.set(a.asset_tag.trim().toLowerCase(), a);
        if (a.serial_number) assetBySerial.set(a.serial_number.trim().toLowerCase(), String(a._id));
      }
      const existingPeople = await PeopleModel.find(scope)
        .select("_id email username name first_name last_name")
        .lean<
          Array<{
            _id: unknown;
            email?: string;
            username?: string;
            name?: string;
            first_name?: string;
            last_name?: string;
          }>
        >();
      for (const p of existingPeople) {
        if (p.email) personByEmail.set(p.email.trim().toLowerCase(), p);
        if (p.username) personByUsername.set(p.username.trim().toLowerCase(), p);
        const nameCandidates = [
          p.name?.trim().toLowerCase(),
          `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase(),
        ].filter((n): n is string => Boolean(n));
        for (const n of new Set(nameCandidates)) {
          if (!personByName.has(n)) {
            personByName.set(n, p);
          } else if (String(personByName.get(n)?._id) !== String(p._id)) {
            personByName.set(n, "AMBIGUOUS");
          }
        }
      }
    } else if (rawEntity === "people") {
      const existingPeople = await PeopleModel.find(scope)
        .select("_id email username name")
        .lean<Array<{ _id: unknown; email?: string; username?: string; name?: string }>>();
      for (const p of existingPeople) {
        if (p.username) personByUsername.set(p.username.trim().toLowerCase(), p);
        if (p.email) personByEmail.set(p.email.trim().toLowerCase(), p);
      }
    } else if (rawEntity === "license") {
      const existing = await LicenseModel.find(scope).select("_id name").lean();
      for (const d of existing as any[]) if (d.name) licenseByName.set(d.name.trim().toLowerCase(), d);
    } else if (rawEntity === "accessory") {
      const existing = await AccessoriesModel.find(scope).select("_id name").lean();
      for (const d of existing as any[]) if (d.name) accessoryByName.set(d.name.trim().toLowerCase(), d);
    } else if (rawEntity === "consumable") {
      const existing = await ConsumableModel.find(scope).select("_id name").lean();
      for (const d of existing as any[]) if (d.name) consumableByName.set(d.name.trim().toLowerCase(), d);
    } else if (rawEntity === "component") {
      const existing = await ComponentModel.find(scope).select("_id name").lean();
      for (const d of existing as any[]) if (d.name) componentByName.set(d.name.trim().toLowerCase(), d);
    } else if (rawEntity === "location") {
      const existing = await LocationModel.find(scope).select("_id name").lean();
      for (const d of existing as any[]) if (d.name) locationByName.set(d.name.trim().toLowerCase(), d);
    } else if (rawEntity === "supplier") {
      const existing = await SupplierModel.find(scope).select("_id name").lean();
      for (const d of existing as any[]) if (d.name) supplierByName.set(d.name.trim().toLowerCase(), d);
    } else if (rawEntity === "category") {
      const existing = await CategoryModel.find(scope).select("_id name").lean();
      for (const d of existing as any[]) if (d.name) categoryByName.set(d.name.trim().toLowerCase(), d);
    }

    const inputRows = body.rows as MappedImportRow[];

    for (let idx = 0; idx < inputRows.length; idx += 1) {
      const row = inputRows[idx] || {};
      const rowNumber = idx + 1;
      const errors: string[] = [];
      const notes: string[] = [];
      let identifier = `Row ${rowNumber}`;

      try {
        if (rawEntity === "asset") {
          const assetTag = asCleanOptionalString(row.asset_tag);
          const serial = asCleanOptionalString(row.serial_number);
          identifier = assetTag || serial || `Row ${rowNumber}`;

          const existing = assetTag ? assetByTag.get(assetTag.toLowerCase()) : undefined;
          const isUpdate = Boolean(existing && updateExisting);

          if (existing && !updateExisting) {
            skippedCount += 1;
            results.push({
              rowNumber,
              identifier,
              action: "skip",
              summary: `Asset Tag "${assetTag}" already exists (Update Existing disabled)`,
              errors: [],
              notes: [],
              raw: row,
            });
            continue;
          }

          if (!assetTag) errors.push("Asset Tag is required.");
          if (!serial && !isUpdate) errors.push("Serial Number is required.");

          if (serial) {
            const serialOwnerId = assetBySerial.get(serial.toLowerCase());
            if (serialOwnerId && (!existing || serialOwnerId !== String(existing._id))) {
              errors.push(`Serial Number "${serial}" already belongs to another asset.`);
            }
          }

          const modelName = asCleanOptionalString(row.asset_model);
          const statusName = asCleanOptionalString(row.status);
          const companyName = asCleanOptionalString(row.company);
          const departmentName = asCleanOptionalString(row.department);
          const locationName = asCleanOptionalString(row.location);
          const manufacturerName = asCleanOptionalString(row.manufacturer);
          const supplierName = asCleanOptionalString(row.supplier);
          const categoryHint = asCleanOptionalString(row.category);

          if (!isUpdate) {
            if (!modelName) errors.push("Asset Model is required.");
            if (!statusName) errors.push("Status Label is required.");
            if (!companyName) errors.push("Company is required.");
            if (!departmentName) errors.push("Department is required.");
            if (!locationName) errors.push("Location is required.");
            if (!manufacturerName) errors.push("Manufacturer is required.");
            if (!supplierName) errors.push("Supplier is required.");
          }

          const costParsed = parseImportNumber(row.purchase_cost);
          if (costParsed.error) errors.push(costParsed.error);
          const warrantyParsed = parseImportNumber(row.warranty);
          if (warrantyParsed.error) errors.push(warrantyParsed.error);
          const purchaseDateParsed = parseImportDate(row.purchase_date);
          if (purchaseDateParsed.error) errors.push(purchaseDateParsed.error);
          const eolDateParsed = parseImportDate(row.eol_date);
          if (eolDateParsed.error) errors.push(eolDateParsed.error);

          let assignedPersonId: string | undefined;
          let shouldClearAssignee = false;
          const assigneeResolution = resolveAssigneePerson(
            row.assigned_to_email,
            personByEmail,
            personByUsername,
            personByName
          );
          if (assigneeResolution.status === "matched" && assigneeResolution.person) {
            assignedPersonId = String(assigneeResolution.person._id);
            notes.push(`Checkout to ${assigneeResolution.displayLabel}`);
          } else if (assigneeResolution.status === "ambiguous") {
            errors.push(
              `Multiple people match "${assigneeResolution.raw}". Use email or username instead.`
            );
          } else if (assigneeResolution.status === "missing") {
            errors.push(`Assignee "${assigneeResolution.raw}" not found in People.`);
          } else if (assigneeResolution.status === "explicit_unassigned" && isUpdate) {
            shouldClearAssignee = true;
          }

          if (errors.length === 0) {
            const [companyRes, locRes, statusRes, mfgRes, supRes, modelRes] = await Promise.all([
              resolver.ensureCompany(companyName),
              resolver.ensureLocation(locationName),
              resolver.ensureStatus(statusName),
              resolver.ensureManufacturer(manufacturerName),
              resolver.ensureSupplier(supplierName),
              resolver.ensureAssetModel(modelName, categoryHint),
            ]);

            const deptRes = await resolver.ensureDepartment(
              departmentName,
              locationName,
              companyRes.id
            );

            for (const r of [companyRes, locRes, statusRes, mfgRes, supRes, modelRes, deptRes]) {
              if (r.error) errors.push(r.error);
              if (r.createdName) notes.push(`Auto-create ${r.createdName}`);
            }

            if (errors.length === 0) {
              if (!isDryRun) {
                const payload: Record<string, unknown> = {};
                const assignField = (k: string, v: unknown) => {
                  if (v !== undefined && v !== "") payload[k] = v;
                  else if (isUpdate && !preserveBlanks) payload[k] = null;
                };

                payload.asset_tag = assetTag;
                if (serial) payload.serial_number = serial;
                if (companyRes.id) payload.company = companyRes.id;
                if (modelRes.id) payload.asset_model = modelRes.id;
                if (statusRes.id) payload.status = statusRes.id;
                if (locRes.id) payload.location = locRes.id;
                if (deptRes.id) payload.department = deptRes.id;
                if (mfgRes.id) payload.manufacturer = mfgRes.id;
                if (supRes.id) payload.supplier = supRes.id;

                assignField("asset_name", asCleanOptionalString(row.asset_name) || undefined);
                if (costParsed.value !== undefined) payload.purchase_cost = costParsed.value;
                if (warrantyParsed.value !== undefined) payload.warranty = warrantyParsed.value;
                if (purchaseDateParsed.value) payload.purchase_date = purchaseDateParsed.value;
                if (eolDateParsed.value) payload.eol_date = eolDateParsed.value;
                assignField("order_number", asCleanOptionalString(row.order_number) || undefined);
                assignField("notes", asCleanOptionalString(row.notes) || undefined);

                if (assignedPersonId) {
                  payload.assigned_to = assignedPersonId;
                  payload.assigned_type = "People";
                  payload.checkout_date = new Date();
                } else if (shouldClearAssignee && !preserveBlanks) {
                  payload.assigned_to = null;
                  payload.assigned_type = null;
                  payload.checkout_date = null;
                  payload.expected_checkin_date = null;
                }

                if (isUpdate && existing) {
                  await AssetModel.findOneAndUpdate(
                    { _id: existing._id, userId: workspaceId },
                    { $set: payload }
                  );
                } else {
                  const created = await AssetModel.create({
                    userId: workspaceId,
                    ...payload,
                  });
                  assetByTag.set(assetTag.toLowerCase(), created);
                  if (serial) assetBySerial.set(serial.toLowerCase(), created._id.toString());
                }
              } else {
                // Keep track of virtual rows for intra-batch duplicate detection in dry_run
                if (!existing && assetTag) {
                  assetByTag.set(assetTag.toLowerCase(), {
                    _id: `__pending_asset_${rowNumber}`,
                    asset_tag: assetTag,
                  });
                }
                if (serial && !assetBySerial.has(serial.toLowerCase())) {
                  assetBySerial.set(serial.toLowerCase(), `__pending_asset_${rowNumber}`);
                }
              }

              if (isUpdate) updatedCount += 1;
              else createdCount += 1;

              results.push({
                rowNumber,
                identifier,
                action: isUpdate ? "update" : "create",
                summary: `${asTrimmedString(row.asset_name) || modelName || assetTag} (${statusName || "existing status"})`,
                errors: [],
                notes,
                raw: row,
              });
              continue;
            }
          }
        } else if (rawEntity === "people") {
          const email = asTrimmedString(row.email).toLowerCase();
          const firstName = asTrimmedString(row.first_name);
          const lastName = asTrimmedString(row.last_name);
          const fullName =
            asTrimmedString(row.name) || [firstName, lastName].filter(Boolean).join(" ");
          const username =
            asTrimmedString(row.username) || (email ? email.split("@")[0] : "");

          identifier = fullName || username || email || `Row ${rowNumber}`;

          const existing =
            (username && personByUsername.get(username.toLowerCase())) ||
            (email && personByEmail.get(email));
          const isUpdate = Boolean(existing && updateExisting);

          if (existing && !updateExisting) {
            skippedCount += 1;
            results.push({
              rowNumber,
              identifier,
              action: "skip",
              summary: `Person "${identifier}" already exists`,
              errors: [],
              notes: [],
              raw: row,
            });
            continue;
          }

          if (!fullName && !isUpdate) errors.push("Full Name (or First + Last Name) is required.");
          if (!username && !isUpdate) errors.push("Username or Email is required.");

          const startParsed = parseImportDate(row.start_date);
          if (startParsed.error) errors.push(startParsed.error);
          const endParsed = parseImportDate(row.end_date);
          if (endParsed.error) errors.push(endParsed.error);

          if (errors.length === 0) {
            const companyName = asTrimmedString(row.company);
            const locationName = asTrimmedString(row.location);
            const deptName = asTrimmedString(row.department);

            const [compRes, locRes] = await Promise.all([
              resolver.ensureCompany(companyName),
              resolver.ensureLocation(locationName),
            ]);
            const deptRes = await resolver.ensureDepartment(
              deptName,
              locationName,
              compRes.id
            );

            for (const r of [compRes, locRes, deptRes]) {
              if (r.error) errors.push(r.error);
              if (r.createdName) notes.push(`Auto-create ${r.createdName}`);
            }

            if (errors.length === 0) {
              if (!isDryRun) {
                const payload: Record<string, unknown> = {};
                if (fullName) payload.name = fullName;
                if (firstName) payload.first_name = firstName;
                if (lastName) payload.last_name = lastName;
                if (username && !isUpdate) payload.username = username;
                if (email) payload.email = email;
                if (asTrimmedString(row.phone)) payload.phone = asTrimmedString(row.phone);
                if (asTrimmedString(row.title)) payload.title = asTrimmedString(row.title);
                if (asTrimmedString(row.employee_num)) {
                  payload.employee_num = asTrimmedString(row.employee_num);
                }
                if (asTrimmedString(row.notes)) payload.notes = asTrimmedString(row.notes);
                if (compRes.id) payload.company = compRes.id;
                if (locRes.id) payload.location = locRes.id;
                if (deptRes.id) payload.department = deptRes.id;
                if (startParsed.value) payload.start_date = startParsed.value;
                if (endParsed.value) payload.end_date = endParsed.value;

                if (isUpdate && existing) {
                  await PeopleModel.findOneAndUpdate(
                    { _id: existing._id, userId: workspaceId },
                    { $set: payload }
                  );
                } else {
                  const created = await PeopleModel.create({
                    userId: workspaceId,
                    ...payload,
                  });
                  if (username) personByUsername.set(username.toLowerCase(), created);
                  if (email) personByEmail.set(email, created);
                }
              } else {
                if (!existing && username) {
                  personByUsername.set(username.toLowerCase(), { _id: `__pending_${rowNumber}` });
                }
                if (!existing && email) {
                  personByEmail.set(email, { _id: `__pending_${rowNumber}` });
                }
              }

              if (isUpdate) updatedCount += 1;
              else createdCount += 1;

              results.push({
                rowNumber,
                identifier,
                action: isUpdate ? "update" : "create",
                summary: `${fullName || existing?.name} (${email || username})`,
                errors: [],
                notes,
                raw: row,
              });
              continue;
            }
          }
        } else if (
          rawEntity === "license" ||
          rawEntity === "accessory" ||
          rawEntity === "consumable" ||
          rawEntity === "component"
        ) {
          const itemName = asTrimmedString(row.name);
          identifier = itemName || `Row ${rowNumber}`;
          const lookupMap =
            rawEntity === "license"
              ? licenseByName
              : rawEntity === "accessory"
              ? accessoryByName
              : rawEntity === "consumable"
              ? consumableByName
              : componentByName;

          const existing = itemName ? lookupMap.get(itemName.toLowerCase()) : undefined;
          const isUpdate = Boolean(existing && updateExisting);

          if (existing && !updateExisting) {
            skippedCount += 1;
            results.push({
              rowNumber,
              identifier,
              action: "skip",
              summary: `${schema.label} "${itemName}" already exists`,
              errors: [],
              notes: [],
              raw: row,
            });
            continue;
          }

          if (!itemName) errors.push(`${schema.label} Name is required.`);

          const catName = asTrimmedString(row.category);
          const compName = asTrimmedString(row.company);
          const mfgName = asTrimmedString(row.manufacturer);
          const supName = asTrimmedString(row.supplier);
          const locName = asTrimmedString(row.location);

          if (!isUpdate) {
            if (!catName) errors.push("Category is required.");
            if (!compName) errors.push("Company is required.");
            if (rawEntity === "license") {
              if (!mfgName) errors.push("Manufacturer is required for Licenses.");
              if (!supName) errors.push("Supplier is required for Licenses.");
            }
          }

          const qtyParsed = parseImportNumber(row.qty);
          const seatsParsed = parseImportNumber(row.seats);
          const availParsed = parseImportNumber(row.seats_available);
          const minAmtParsed = parseImportNumber(row.min_amt);
          const costParsed = parseImportNumber(row.purchase_cost);
          const purchaseDateParsed = parseImportDate(row.purchase_date);
          const expiryParsed = parseImportDate(row.expiry_date);

          for (const p of [
            qtyParsed,
            seatsParsed,
            availParsed,
            minAmtParsed,
            costParsed,
            purchaseDateParsed,
            expiryParsed,
          ]) {
            if (p.error) errors.push(p.error);
          }

          if (rawEntity !== "license" && !isUpdate && qtyParsed.value === undefined) {
            errors.push("Quantity is required.");
          }
          if (rawEntity === "license" && !isUpdate && seatsParsed.value === undefined) {
            errors.push("Seats count is required for Licenses.");
          }

          if (errors.length === 0) {
            const [catRes, compRes, mfgRes, supRes, locRes] = await Promise.all([
              resolver.ensureCategory(catName, rawEntity),
              resolver.ensureCompany(compName),
              resolver.ensureManufacturer(mfgName),
              resolver.ensureSupplier(supName),
              resolver.ensureLocation(locName),
            ]);

            for (const r of [catRes, compRes, mfgRes, supRes, locRes]) {
              if (r.error) errors.push(r.error);
              if (r.createdName) notes.push(`Auto-create ${r.createdName}`);
            }

            if (errors.length === 0) {
              if (!isDryRun) {
                const payload: Record<string, unknown> = { name: itemName };
                if (catRes.id) payload.category = catRes.id;
                if (compRes.id) payload.company = compRes.id;
                if (mfgRes.id) payload.manufacturer = mfgRes.id;
                if (supRes.id) payload.supplier = supRes.id;
                if (locRes.id) payload.location = locRes.id;
                if (minAmtParsed.value !== undefined) payload.min_amt = minAmtParsed.value;
                if (costParsed.value !== undefined) payload.purchase_cost = costParsed.value;
                if (purchaseDateParsed.value) payload.purchase_date = purchaseDateParsed.value;
                if (asTrimmedString(row.order_number)) {
                  payload.order_number = asTrimmedString(row.order_number);
                }

                if (rawEntity === "license") {
                  if (seatsParsed.value !== undefined) payload.seats = seatsParsed.value;
                  if (availParsed.value !== undefined) {
                    payload.seats_available = availParsed.value;
                  } else if (!isUpdate && seatsParsed.value !== undefined) {
                    payload.seats_available = seatsParsed.value;
                  }
                  if (asTrimmedString(row.product_key)) {
                    payload.product_key = asTrimmedString(row.product_key);
                  }
                  if (expiryParsed.value) payload.expiry_date = expiryParsed.value;
                  if (asTrimmedString(row.license_to_name)) {
                    payload.license_to_name = asTrimmedString(row.license_to_name);
                  }
                  if (asTrimmedString(row.license_to_email)) {
                    payload.license_to_email = asTrimmedString(row.license_to_email).toLowerCase();
                  }

                  if (isUpdate && existing) {
                    await LicenseModel.findOneAndUpdate(
                      { _id: existing._id, userId: workspaceId },
                      { $set: payload }
                    );
                  } else {
                    const created = await LicenseModel.create({ userId: workspaceId, ...payload });
                    lookupMap.set(itemName.toLowerCase(), created);
                  }
                } else {
                  if (qtyParsed.value !== undefined) payload.qty = qtyParsed.value;
                  if (rawEntity === "accessory" && asTrimmedString(row.model_no)) {
                    payload.model_no = asTrimmedString(row.model_no);
                  }
                  if (rawEntity === "consumable" && asTrimmedString(row.item_no)) {
                    payload.item_no = asTrimmedString(row.item_no);
                  }
                  if (rawEntity === "component" && asTrimmedString(row.serial_number)) {
                    payload.serial_number = asTrimmedString(row.serial_number);
                  }

                  const targetModel =
                    rawEntity === "accessory"
                      ? AccessoriesModel
                      : rawEntity === "consumable"
                      ? ConsumableModel
                      : ComponentModel;

                  if (isUpdate && existing) {
                    await (targetModel as mongoose.Model<any>).findOneAndUpdate(
                      { _id: existing._id, userId: workspaceId },
                      { $set: payload }
                    );
                  } else {
                    const created = await (targetModel as mongoose.Model<any>).create({
                      userId: workspaceId,
                      ...payload,
                    });
                    lookupMap.set(itemName.toLowerCase(), created);
                  }
                }
              } else {
                if (!existing && itemName) {
                  lookupMap.set(itemName.toLowerCase(), { _id: `__pending_${rowNumber}`, name: itemName });
                }
              }

              if (isUpdate) updatedCount += 1;
              else createdCount += 1;

              results.push({
                rowNumber,
                identifier,
                action: isUpdate ? "update" : "create",
                summary:
                  rawEntity === "license"
                    ? `${itemName} (${seatsParsed.value ?? "-"} seats)`
                    : `${itemName} (qty: ${qtyParsed.value ?? "-"})`,
                errors: [],
                notes,
                raw: row,
              });
              continue;
            }
          }
        } else if (rawEntity === "location" || rawEntity === "supplier" || rawEntity === "category") {
          const name = asTrimmedString(row.name);
          identifier = name || `Row ${rowNumber}`;

          const lookupMap =
            rawEntity === "location"
              ? locationByName
              : rawEntity === "supplier"
              ? supplierByName
              : categoryByName;

          const existing = name ? lookupMap.get(name.toLowerCase()) : undefined;
          const isUpdate = Boolean(existing && updateExisting);

          if (existing && !updateExisting) {
            skippedCount += 1;
            results.push({
              rowNumber,
              identifier,
              action: "skip",
              summary: `${schema.label} "${name}" already exists`,
              errors: [],
              notes: [],
              raw: row,
            });
            continue;
          }

          if (!name) errors.push(`${schema.label} Name is required.`);

          if (rawEntity === "supplier" && !isUpdate) {
            if (!asTrimmedString(row.contact_name)) errors.push("Contact Name is required.");
            if (!asTrimmedString(row.email)) errors.push("Email is required.");
            if (!asTrimmedString(row.phone)) errors.push("Phone is required.");
            if (!asTrimmedString(row.address)) errors.push("Address is required.");
          }
          if (rawEntity === "category" && !isUpdate && !asTrimmedString(row.type)) {
            errors.push("Category Type is required (e.g. asset, license, accessory).");
          }

          if (errors.length === 0) {
            if (!isDryRun) {
              if (rawEntity === "location") {
                const payload = {
                  name,
                  ...(asTrimmedString(row.currency) ? { currency: asTrimmedString(row.currency) } : {}),
                  ...(asTrimmedString(row.address) ? { address: asTrimmedString(row.address) } : {}),
                  ...(asTrimmedString(row.city) ? { city: asTrimmedString(row.city) } : {}),
                  ...(asTrimmedString(row.state) ? { state: asTrimmedString(row.state) } : {}),
                };
                if (isUpdate && existing) {
                  await LocationModel.findOneAndUpdate({ _id: existing._id, userId: workspaceId }, { $set: payload });
                } else {
                  const doc = await LocationModel.create({ userId: workspaceId, ...payload });
                  lookupMap.set(name.toLowerCase(), doc);
                }
              } else if (rawEntity === "supplier") {
                const payload = {
                  name,
                  ...(asTrimmedString(row.contact_name) ? { contact_name: asTrimmedString(row.contact_name) } : {}),
                  ...(asTrimmedString(row.email) ? { email: asTrimmedString(row.email) } : {}),
                  ...(asTrimmedString(row.phone) ? { phone: asTrimmedString(row.phone) } : {}),
                  ...(asTrimmedString(row.address) ? { address: asTrimmedString(row.address) } : {}),
                };
                if (isUpdate && existing) {
                  await SupplierModel.findOneAndUpdate({ _id: existing._id, userId: workspaceId }, { $set: payload });
                } else {
                  const doc = await SupplierModel.create({ userId: workspaceId, ...payload });
                  lookupMap.set(name.toLowerCase(), doc);
                }
              } else {
                const payload = {
                  name,
                  ...(asTrimmedString(row.type) ? { type: asTrimmedString(row.type).toLowerCase() } : {}),
                  email: parseImportBoolean(row.email, false),
                };
                if (isUpdate && existing) {
                  await CategoryModel.findOneAndUpdate({ _id: existing._id, userId: workspaceId }, { $set: payload });
                } else {
                  const doc = await CategoryModel.create({ userId: workspaceId, ...payload });
                  lookupMap.set(name.toLowerCase(), doc);
                }
              }
            } else if (!existing && name) {
              lookupMap.set(name.toLowerCase(), { _id: `__pending_${rowNumber}`, name });
            }

            if (isUpdate) updatedCount += 1;
            else createdCount += 1;

            results.push({
              rowNumber,
              identifier,
              action: isUpdate ? "update" : "create",
              summary: name,
              errors: [],
              notes,
              raw: row,
            });
            continue;
          }
        }
      } catch (rowErr) {
        errors.push(rowErr instanceof Error ? rowErr.message : "Database write failed for row");
      }

      if (errors.length > 0) {
        errorCount += 1;
        results.push({
          rowNumber,
          identifier,
          action: "error",
          summary: errors[0],
          errors,
          notes,
          raw: row,
        });
        if (!isDryRun && !skipInvalidRows) {
          break;
        }
      }
    }

    if (!isDryRun) {
      invalidateElasticIndexCache(workspaceId);

      const errorPreview = results
        .filter((r) => r.action === "error")
        .slice(0, 50)
        .map((r) => ({
          rowNumber: r.rowNumber,
          identifier: r.identifier,
          message: r.errors.join("; "),
        }));

      await ImportJobModel.create({
        userId: workspaceId,
        actorId: actor.userId,
        actorName: actor.dbUser.name || actor.dbUser.email,
        filename,
        fileFormat,
        entityType: rawEntity,
        updateExisting,
        preserveBlanks,
        autoCreateTaxonomy,
        totalRows: inputRows.length,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        autoCreatedTaxonomy: resolver.autoCreatedLabels,
        errorsPreview: errorPreview,
      }).catch(() => null);

      await ActionLogModel.create({
        userId: workspaceId,
        item_id: new mongoose.Types.ObjectId(actor.userId),
        item_type: "User",
        item_name: actor.dbUser.name || actor.dbUser.email,
        action_type: "create",
        admin_id: actor.userId,
        admin_name: actor.dbUser.name || actor.dbUser.email,
        notes: `Imported ${createdCount} created, ${updatedCount} updated ${schema.pluralLabel} from "${filename}"`,
      }).catch(() => null);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          mode,
          entityType: rawEntity,
          totalRows: inputRows.length,
          createdCount,
          updatedCount,
          skippedCount,
          errorCount,
          autoCreatedTaxonomy: resolver.autoCreatedLabels,
          rows: results,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Smart Import error:", error);
    return NextResponse.json(
      { success: false, message: "Import processing failed." },
      { status: 500 }
    );
  }
}

