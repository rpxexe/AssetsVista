import dbconnect from "@/lib/dbconnect";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { ensureMultiTenantIndexes } from "@/lib/userIndexes";
import { AccessoriesModel } from "@/models/Accessories.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";

export interface DemoSeedSummary {
  companies: number;
  locations: number;
  departments: number;
  categories: number;
  statuses: number;
  manufacturers: number;
  suppliers: number;
  assetModels: number;
  people: number;
  assets: number;
  licenses: number;
  accessories: number;
  components: number;
  consumables: number;
  actionLogs: number;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

async function upsertByName<T extends { _id: any }>(
  model: any,
  userId: string,
  name: string,
  insertFields: Record<string, unknown>
): Promise<T> {
  return model
    .findOneAndUpdate(
      { userId, name },
      { $setOnInsert: { userId, name, ...insertFields } },
      { upsert: true, new: true }
    )
    .lean();
}

/**
 * Idempotently populates realistic demo records across ALL AssetsVista collections
 * scoped strictly to the target `workspaceId` (`userId`).
 */
export async function seedWorkspaceDemoData(workspaceId: string): Promise<DemoSeedSummary> {
  await dbconnect();
  await ensureMultiTenantIndexes();

  // 1. Companies & Locations
  const [acme, nova, sfHq, nyHub, austinOps] = await Promise.all([
    upsertByName<any>(CompanyModel, workspaceId, "Acme Technologies", {
      email: "it@acmetech.example.com",
    }),
    upsertByName<any>(CompanyModel, workspaceId, "Nova Cloud Labs", {
      email: "ops@novacloud.example.com",
    }),
    upsertByName<any>(LocationModel, workspaceId, "San Francisco HQ", {
      currency: "USD",
      address: "550 Market St, Suite 400",
      city: "San Francisco",
      state: "CA",
    }),
    upsertByName<any>(LocationModel, workspaceId, "New York Hub", {
      currency: "USD",
      address: "350 Fifth Ave, Floor 18",
      city: "New York",
      state: "NY",
    }),
    upsertByName<any>(LocationModel, workspaceId, "Austin Operations", {
      currency: "USD",
      address: "301 Congress Ave",
      city: "Austin",
      state: "TX",
    }),
  ]);

  // 2. Departments, Statuses, Categories, Manufacturers, Suppliers
  const [
    deptEng,
    deptOps,
    deptDesign,
    statusReady,
    statusCheckedOut,
    statusDeployed,
    statusPending,
    statusRequestable,
    catLaptops,
    catMonitors,
    catMobile,
    catSoftware,
    catAccessories,
    catComponents,
    catConsumables,
    mfgApple,
    mfgDell,
    mfgLenovo,
    mfgLogitech,
    mfgMicrosoft,
    supCdw,
    supInsight,
  ] = await Promise.all([
    upsertByName<any>(DepartmentModel, workspaceId, "Engineering", {
      company: acme._id,
      location: sfHq._id,
      phone: "+1-415-555-0140",
    }),
    upsertByName<any>(DepartmentModel, workspaceId, "IT & Security", {
      company: acme._id,
      location: nyHub._id,
      phone: "+1-212-555-0192",
    }),
    upsertByName<any>(DepartmentModel, workspaceId, "Product Design", {
      company: nova._id,
      location: austinOps._id,
      phone: "+1-512-555-0177",
    }),
    upsertByName<any>(StatusModel, workspaceId, "Ready to Deploy", {
      type: "deployable",
      notes: "Available in stockroom for assignment",
    }),
    upsertByName<any>(StatusModel, workspaceId, "CheckedOut", {
      type: "deployable",
      notes: "Checked out to an active employee",
    }),
    upsertByName<any>(StatusModel, workspaceId, "Deployed", {
      type: "deployable",
      notes: "Active in production / workstation setup",
    }),
    upsertByName<any>(StatusModel, workspaceId, "Pending", {
      type: "pending",
      notes: "Awaiting repair, imaging, or parts",
    }),
    upsertByName<any>(StatusModel, workspaceId, "Requestable", {
      type: "deployable",
      notes: "Eligible for employee self-service request",
    }),
    upsertByName<any>(CategoryModel, workspaceId, "Laptops", { type: "Asset", email: true }),
    upsertByName<any>(CategoryModel, workspaceId, "Monitors", { type: "Asset", email: false }),
    upsertByName<any>(CategoryModel, workspaceId, "Mobile Devices", { type: "Asset", email: true }),
    upsertByName<any>(CategoryModel, workspaceId, "Software Licenses", { type: "License", email: true }),
    upsertByName<any>(CategoryModel, workspaceId, "Keyboards & Mice", { type: "Accessory", email: false }),
    upsertByName<any>(CategoryModel, workspaceId, "Memory & Storage", { type: "Component", email: false }),
    upsertByName<any>(CategoryModel, workspaceId, "Office Consumables", { type: "Consumable", email: false }),
    upsertByName<any>(ManufacturerModel, workspaceId, "Apple", {
      url: "https://www.apple.com",
      support_url: "https://support.apple.com",
      support_phone: "1-800-275-2273",
      support_email: "enterprise@apple.com",
    }),
    upsertByName<any>(ManufacturerModel, workspaceId, "Dell", {
      url: "https://www.dell.com",
      support_url: "https://www.dell.com/support",
      support_phone: "1-800-624-9896",
      support_email: "support@dell.com",
    }),
    upsertByName<any>(ManufacturerModel, workspaceId, "Lenovo", {
      url: "https://www.lenovo.com",
      support_url: "https://support.lenovo.com",
      support_phone: "1-855-253-6686",
      support_email: "support@lenovo.com",
    }),
    upsertByName<any>(ManufacturerModel, workspaceId, "Logitech", {
      url: "https://www.logitech.com",
      support_url: "https://support.logi.com",
      support_phone: "1-646-454-3200",
      support_email: "b2b@logitech.com",
    }),
    upsertByName<any>(ManufacturerModel, workspaceId, "Microsoft", {
      url: "https://www.microsoft.com",
      support_url: "https://support.microsoft.com",
      support_phone: "1-800-642-7676",
      support_email: "licensing@microsoft.com",
    }),
    upsertByName<any>(SupplierModel, workspaceId, "CDW Direct", {
      address: "200 N Milwaukee Ave, Vernon Hills, IL",
      contact_name: "Rachel Alvarez",
      email: "orders@cdw.example.com",
      phone: "1-800-800-4239",
    }),
    upsertByName<any>(SupplierModel, workspaceId, "Insight Enterprise", {
      address: "2701 E Insight Way, Chandler, AZ",
      contact_name: "Marcus Bennett",
      email: "sales@insight.example.com",
      phone: "1-800-467-4448",
    }),
  ]);

  // Also ensure extra standard Snipe-IT statuses exist
  await Promise.all([
    upsertByName<any>(StatusModel, workspaceId, "Undeployed", {
      type: "undeployable",
      notes: "Decommissioned or hardware fault",
    }),
    upsertByName<any>(StatusModel, workspaceId, "Archived", {
      type: "archived",
      notes: "Retired inventory record",
    }),
  ]);

  // 3. Asset Models
  const [modelMbp, modelLatitude, modelThinkpad, modelUltraSharp, modelIphone] = await Promise.all([
    upsertByName<any>(AssetModel_Model, workspaceId, "MacBook Pro 16 M3 Pro", {
      model_no: "MRW13LL/A",
      category: catLaptops._id,
      eol_rate: 36,
    }),
    upsertByName<any>(AssetModel_Model, workspaceId, "Dell Latitude 7440", {
      model_no: "LAT-7440-G13",
      category: catLaptops._id,
      eol_rate: 36,
    }),
    upsertByName<any>(AssetModel_Model, workspaceId, "ThinkPad X1 Carbon Gen 11", {
      model_no: "21HM000AUS",
      category: catLaptops._id,
      eol_rate: 36,
    }),
    upsertByName<any>(AssetModel_Model, workspaceId, "Dell UltraSharp 27 4K", {
      model_no: "U2723QE",
      category: catMonitors._id,
      eol_rate: 48,
    }),
    upsertByName<any>(AssetModel_Model, workspaceId, "iPhone 15 Pro", {
      model_no: "A2848",
      category: catMobile._id,
      eol_rate: 24,
    }),
  ]);

  // 4. People Directory
  const staffConfigs = [
    {
      username: "maya.lin",
      name: "Maya Lin",
      first_name: "Maya",
      last_name: "Lin",
      title: "Staff Software Engineer",
      email: "maya.lin@acmetech.example.com",
      phone: "+1-415-555-0181",
      employee_num: "EMP-102",
      department: deptEng._id,
      location: sfHq._id,
      company: acme._id,
    },
    {
      username: "marcus.vance",
      name: "Marcus Vance",
      first_name: "Marcus",
      last_name: "Vance",
      title: "Security Lead",
      email: "marcus.vance@acmetech.example.com",
      phone: "+1-212-555-0164",
      employee_num: "EMP-103",
      department: deptOps._id,
      location: nyHub._id,
      company: acme._id,
    },
    {
      username: "elena.rostova",
      name: "Elena Rostova",
      first_name: "Elena",
      last_name: "Rostova",
      title: "Principal Product Designer",
      email: "elena.rostova@novacloud.example.com",
      phone: "+1-512-555-0133",
      employee_num: "EMP-104",
      department: deptDesign._id,
      location: austinOps._id,
      company: nova._id,
    },
    {
      username: "david.chen",
      name: "David Chen",
      first_name: "David",
      last_name: "Chen",
      title: "Systems Administrator",
      email: "david.chen@acmetech.example.com",
      phone: "+1-415-555-0119",
      employee_num: "EMP-105",
      department: deptOps._id,
      location: sfHq._id,
      company: acme._id,
    },
  ];

  const peopleDocs = await Promise.all(
    staffConfigs.map((p) =>
      PeopleModel.findOneAndUpdate(
        { userId: workspaceId, username: p.username },
        { $setOnInsert: { userId: workspaceId, ...p } },
        { upsert: true, new: true }
      ).lean<any>()
    )
  );
  const [maya, marcus, elena, david] = peopleDocs;

  // 5. Assets (spanning checked out, overdue checkin, due audit, requestable, ready to deploy)
  const assetSpecs = [
    {
      asset_tag: "AST-1001",
      serial_number: "SN-MBP-88901",
      asset_name: "MacBook Pro 16 — Maya",
      company: acme._id,
      asset_model: modelMbp._id,
      status: statusCheckedOut._id,
      location: sfHq._id,
      supplier: supCdw._id,
      manufacturer: mfgApple._id,
      department: deptEng._id,
      warranty: 3,
      order_number: "PO-2025-101",
      purchase_date: monthsAgo(10),
      eol_date: daysFromNow(760),
      purchase_cost: 2899,
      assigned_to: maya._id,
      assigned_type: "People",
      checkout_date: monthsAgo(6),
      expected_checkin_date: daysFromNow(180),
      last_audit_date: monthsAgo(3),
      next_audit_date: daysFromNow(270),
    },
    {
      asset_tag: "AST-1002",
      serial_number: "SN-LAT-74402",
      asset_name: "Dell Latitude 7440 — Security",
      company: acme._id,
      asset_model: modelLatitude._id,
      status: statusCheckedOut._id,
      location: nyHub._id,
      supplier: supInsight._id,
      manufacturer: mfgDell._id,
      department: deptOps._id,
      warranty: 3,
      order_number: "PO-2025-102",
      purchase_date: monthsAgo(14),
      eol_date: daysFromNow(640),
      purchase_cost: 1750,
      assigned_to: marcus._id,
      assigned_type: "People",
      checkout_date: monthsAgo(9),
      expected_checkin_date: daysFromNow(-7), // Overdue return for Maintenance Report
      last_audit_date: null,
      next_audit_date: daysFromNow(-5), // Due for audit
    },
    {
      asset_tag: "AST-1003",
      serial_number: "SN-X1C-55003",
      asset_name: "ThinkPad X1 Carbon Loaner",
      company: acme._id,
      asset_model: modelThinkpad._id,
      status: statusRequestable._id,
      location: sfHq._id,
      supplier: supCdw._id,
      manufacturer: mfgLenovo._id,
      department: deptOps._id,
      warranty: 3,
      order_number: "PO-2025-108",
      purchase_date: monthsAgo(5),
      eol_date: daysFromNow(900),
      purchase_cost: 1920,
      last_audit_date: monthsAgo(2),
      next_audit_date: daysFromNow(300),
    },
    {
      asset_tag: "AST-1004",
      serial_number: "SN-MON-27004",
      asset_name: "UltraSharp 27 4K Studio Display",
      company: nova._id,
      asset_model: modelUltraSharp._id,
      status: statusDeployed._id,
      location: austinOps._id,
      supplier: supInsight._id,
      manufacturer: mfgDell._id,
      department: deptDesign._id,
      warranty: 3,
      order_number: "PO-2025-114",
      purchase_date: monthsAgo(18),
      eol_date: daysFromNow(540),
      purchase_cost: 680,
      assigned_to: elena._id,
      assigned_type: "People",
      checkout_date: monthsAgo(12),
      last_audit_date: monthsAgo(13),
      next_audit_date: daysFromNow(-15),
    },
    {
      asset_tag: "AST-1005",
      serial_number: "SN-IPH-15005",
      asset_name: "iPhone 15 Pro Test Device",
      company: acme._id,
      asset_model: modelIphone._id,
      status: statusReady._id,
      location: sfHq._id,
      supplier: supCdw._id,
      manufacturer: mfgApple._id,
      department: deptEng._id,
      warranty: 2,
      order_number: "PO-2026-019",
      purchase_date: monthsAgo(4),
      eol_date: daysFromNow(600),
      purchase_cost: 1099,
      last_audit_date: null,
      next_audit_date: daysFromNow(90),
    },
    {
      asset_tag: "AST-1006",
      serial_number: "SN-MBP-88906",
      asset_name: "MacBook Pro 16 — Dock Repair",
      company: acme._id,
      asset_model: modelMbp._id,
      status: statusPending._id,
      location: nyHub._id,
      supplier: supCdw._id,
      manufacturer: mfgApple._id,
      department: deptOps._id,
      warranty: 3,
      order_number: "PO-2024-088",
      purchase_date: monthsAgo(24),
      eol_date: daysFromNow(365),
      purchase_cost: 2799,
      assigned_to: david._id,
      assigned_type: "People",
      checkout_date: monthsAgo(18),
      expected_checkin_date: daysFromNow(-2),
      last_audit_date: monthsAgo(6),
      next_audit_date: daysFromNow(180),
      notes: "USB-C port board scheduled for AppleCare swap",
    },
  ];

  const assetDocs = await Promise.all(
    assetSpecs.map((a) =>
      AssetModel.findOneAndUpdate(
        { userId: workspaceId, asset_tag: a.asset_tag },
        { $setOnInsert: { userId: workspaceId, ...a } },
        { upsert: true, new: true }
      ).lean<any>()
    )
  );

  // 6. Licenses
  const licenseSpecs = [
    {
      name: "JetBrains All Products Pack",
      category: catSoftware._id,
      product_key: "JB-ENT-9941-8820-7710",
      company: acme._id,
      supplier: supInsight._id,
      manufacturer: mfgMicrosoft._id,
      seats: 25,
      seats_available: 7,
      license_to_name: "Maya Lin",
      license_to_email: "maya.lin@acmetech.example.com",
      order_number: "LIC-2025-01",
      purchase_date: monthsAgo(5),
      expiry_date: daysFromNow(210),
      purchase_cost: 6250,
    },
    {
      name: "Microsoft 365 E5 Enterprise",
      category: catSoftware._id,
      product_key: "MS-E5-4410-2201-9981",
      company: acme._id,
      supplier: supCdw._id,
      manufacturer: mfgMicrosoft._id,
      seats: 50,
      seats_available: 12,
      license_to_name: "Marcus Vance",
      license_to_email: "marcus.vance@acmetech.example.com",
      order_number: "LIC-2025-09",
      purchase_date: monthsAgo(11),
      expiry_date: daysFromNow(18), // Expiring soon alert
      purchase_cost: 14400,
    },
    {
      name: "Adobe Creative Cloud Teams",
      category: catSoftware._id,
      product_key: "ADOBE-CC-3310-7721",
      company: nova._id,
      supplier: supInsight._id,
      manufacturer: mfgApple._id,
      seats: 10,
      seats_available: 2,
      license_to_name: "Elena Rostova",
      license_to_email: "elena.rostova@novacloud.example.com",
      order_number: "LIC-2024-12",
      purchase_date: monthsAgo(13),
      expiry_date: daysFromNow(-12), // Expired alert
      purchase_cost: 3600,
    },
  ];

  for (const lic of licenseSpecs) {
    await LicenseModel.findOneAndUpdate(
      { userId: workspaceId, name: lic.name },
      { $setOnInsert: { userId: workspaceId, ...lic } },
      { upsert: true }
    );
  }

  // 7. Accessories
  const accessorySpecs = [
    {
      name: "Logitech MX Master 3S Mouse",
      category: catAccessories._id,
      company: acme._id,
      manufacturer: mfgLogitech._id,
      supplier: supCdw._id,
      location: sfHq._id,
      model_no: "910-006556",
      order_number: "ACC-401",
      qty: 18,
      min_amt: 5,
      purchase_cost: 99,
      purchase_date: monthsAgo(4),
    },
    {
      name: "Logitech MX Keys Mini Keyboard",
      category: catAccessories._id,
      company: acme._id,
      manufacturer: mfgLogitech._id,
      supplier: supCdw._id,
      location: nyHub._id,
      model_no: "920-010475",
      order_number: "ACC-402",
      qty: 4, // Low stock example
      min_amt: 5,
      purchase_cost: 99,
      purchase_date: monthsAgo(6),
    },
    {
      name: "Apple USB-C Digital AV Multiport",
      category: catAccessories._id,
      company: nova._id,
      manufacturer: mfgApple._id,
      supplier: supInsight._id,
      location: austinOps._id,
      model_no: "MUF82AM/A",
      order_number: "ACC-403",
      qty: 24,
      min_amt: 6,
      purchase_cost: 69,
      purchase_date: monthsAgo(2),
    },
  ];

  for (const acc of accessorySpecs) {
    await AccessoriesModel.findOneAndUpdate(
      { userId: workspaceId, name: acc.name },
      { $setOnInsert: { userId: workspaceId, ...acc } },
      { upsert: true }
    );
  }

  // 8. Components
  const componentSpecs = [
    {
      name: "Crucial 32GB DDR5-5600 SO-DIMM",
      category: catComponents._id,
      company: acme._id,
      manufacturer: mfgDell._id,
      supplier: supInsight._id,
      location: sfHq._id,
      serial_number: "CMP-DDR5-9001",
      order_number: "CMP-201",
      qty: 14,
      min_amt: 4,
      purchase_cost: 115,
      purchase_date: monthsAgo(3),
    },
    {
      name: "Samsung 990 PRO 2TB NVMe SSD",
      category: catComponents._id,
      company: acme._id,
      manufacturer: mfgDell._id,
      supplier: supCdw._id,
      location: nyHub._id,
      serial_number: "CMP-NVME-9002",
      order_number: "CMP-202",
      qty: 3, // Low stock example
      min_amt: 5,
      purchase_cost: 169,
      purchase_date: monthsAgo(5),
    },
  ];

  for (const cmp of componentSpecs) {
    await ComponentModel.findOneAndUpdate(
      { userId: workspaceId, name: cmp.name },
      { $setOnInsert: { userId: workspaceId, ...cmp } },
      { upsert: true }
    );
  }

  // 9. Consumables
  const consumableSpecs = [
    {
      name: "Cat6a Shielded Patch Cable (3ft, Pack of 10)",
      category: catConsumables._id,
      company: acme._id,
      manufacturer: mfgDell._id,
      supplier: supCdw._id,
      location: sfHq._id,
      item_no: "CON-CAT6-01",
      order_number: "CON-301",
      qty: 32,
      min_amt: 8,
      purchase_cost: 28,
      purchase_date: monthsAgo(2),
    },
    {
      name: "HP LaserJet Black Toner Cartridge 58A",
      category: catConsumables._id,
      company: nova._id,
      manufacturer: mfgDell._id,
      supplier: supInsight._id,
      location: austinOps._id,
      item_no: "CON-TONER-58A",
      order_number: "CON-302",
      qty: 2, // Low stock example
      min_amt: 3,
      purchase_cost: 112,
      purchase_date: monthsAgo(7),
    },
  ];

  for (const con of consumableSpecs) {
    await ConsumableModel.findOneAndUpdate(
      { userId: workspaceId, name: con.name },
      { $setOnInsert: { userId: workspaceId, ...con } },
      { upsert: true }
    );
  }

  // 10. Activity Audit Logs (create only if this workspace has zero logs yet)
  const existingLogsCount = await ActionLogModel.countDocuments({ userId: workspaceId });
  let createdLogs = 0;
  if (existingLogsCount === 0 && assetDocs.length > 0) {
    const sampleLogs = [
      {
        userId: workspaceId,
        item_id: assetDocs[0]._id,
        item_type: "Asset" as const,
        item_name: assetDocs[0].asset_name || assetDocs[0].asset_tag,
        action_type: "checkout" as const,
        target_id: maya._id,
        target_type: "People" as const,
        target_name: maya.name,
        admin_name: "System Seeder",
        note: "Issued primary engineering workstation",
        notes: "Issued primary engineering workstation",
      },
      {
        userId: workspaceId,
        item_id: assetDocs[1]._id,
        item_type: "Asset" as const,
        item_name: assetDocs[1].asset_name || assetDocs[1].asset_tag,
        action_type: "checkout" as const,
        target_id: marcus._id,
        target_type: "People" as const,
        target_name: marcus.name,
        admin_name: "System Seeder",
        notes: "Issued security field laptop",
      },
      {
        userId: workspaceId,
        item_id: assetDocs[2]._id,
        item_type: "Asset" as const,
        item_name: assetDocs[2].asset_name || assetDocs[2].asset_tag,
        action_type: "audit" as const,
        admin_name: "System Seeder",
        notes: "Physical inventory barcode check verified",
      },
      {
        userId: workspaceId,
        item_id: assetDocs[4]._id,
        item_type: "Asset" as const,
        item_name: assetDocs[4].asset_name || assetDocs[4].asset_tag,
        action_type: "create" as const,
        admin_name: "System Seeder",
        notes: "Added demo iPhone 15 Pro test unit",
      },
    ];
    await ActionLogModel.insertMany(sampleLogs);
    createdLogs = sampleLogs.length;
  }

  // 11. Ensure Settings exists for workspace if none exists yet
  await SettingsModel.findOneAndUpdate(
    { userId: workspaceId },
    {
      $setOnInsert: {
        userId: workspaceId,
        site_name: "AssetsVista",
        default_currency: "$",
        currency_code: "USD",
        locale: "en-US",
        auto_increment_prefix: "AST-",
        auto_increment_assets: true,
        audit_interval_months: 12,
        setup_completed: true,
        setup_completed_at: new Date(),
        setup_completed_by: "Demo Workspace",
      },
    },
    { upsert: true }
  );

  invalidateElasticIndexCache(workspaceId);

  return {
    companies: 2,
    locations: 3,
    departments: 3,
    categories: 7,
    statuses: 7,
    manufacturers: 5,
    suppliers: 2,
    assetModels: 5,
    people: peopleDocs.length,
    assets: assetDocs.length,
    licenses: licenseSpecs.length,
    accessories: accessorySpecs.length,
    components: componentSpecs.length,
    consumables: consumableSpecs.length,
    actionLogs: createdLogs,
  };
}

