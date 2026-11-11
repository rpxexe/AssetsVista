export type ImportEntityType =
  | "asset"
  | "people"
  | "license"
  | "accessory"
  | "consumable"
  | "component"
  | "location"
  | "supplier"
  | "category";

export interface ImportFieldDef {
  key: string;
  label: string;
  required?: boolean;
  type: "string" | "number" | "date" | "boolean";
  aliases: string[];
  example: string;
  hint?: string;
}

export interface ImportEntitySchema {
  type: ImportEntityType;
  label: string;
  pluralLabel: string;
  description: string;
  matchKeyLabel: string;
  redirectHref: string;
  permissionKey: "canCreateEditAssets" | "canManagePeople" | "canManageSettings";
  supportsAutoTaxonomy: boolean;
  fields: ImportFieldDef[];
}

export const IMPORT_ENTITY_SCHEMAS: Record<ImportEntityType, ImportEntitySchema> = {
  asset: {
    type: "asset",
    label: "Asset",
    pluralLabel: "Assets",
    description:
      "Import hardware assets with serial numbers, models, locations, purchase metadata, and optional employee checkout.",
    matchKeyLabel: "Asset Tag",
    redirectHref: "/assets/listall",
    permissionKey: "canCreateEditAssets",
    supportsAutoTaxonomy: true,
    fields: [
      {
        key: "asset_tag",
        label: "Asset Tag",
        required: true,
        type: "string",
        aliases: ["asset tag", "tag", "asset_tag", "asset id", "id"],
        example: "AST-1042",
      },
      {
        key: "serial_number",
        label: "Serial Number",
        required: true,
        type: "string",
        aliases: ["serial", "serial number", "serial_number", "sn", "service tag"],
        example: "C02ZN89KMD6R",
      },
      {
        key: "asset_name",
        label: "Asset Name",
        type: "string",
        aliases: ["asset name", "name", "item name", "item_name", "hostname", "device name"],
        example: "Engineering MacBook Pro 16",
      },
      {
        key: "asset_model",
        label: "Asset Model",
        required: true,
        type: "string",
        aliases: ["model", "model name", "asset model", "asset_model"],
        example: "MacBook Pro 16 M3",
      },
      {
        key: "category",
        label: "Category (for new Models)",
        type: "string",
        aliases: ["category", "category name"],
        example: "Laptops",
        hint: "Used when auto-creating a missing Asset Model.",
      },
      {
        key: "status",
        label: "Status Label",
        required: true,
        type: "string",
        aliases: ["status", "status label", "state"],
        example: "Ready to Deploy",
      },
      {
        key: "company",
        label: "Company",
        required: true,
        type: "string",
        aliases: ["company", "company name", "entity", "org"],
        example: "Acme Corp",
      },
      {
        key: "department",
        label: "Department",
        required: true,
        type: "string",
        aliases: ["department", "dept", "team"],
        example: "Engineering",
      },
      {
        key: "location",
        label: "Location",
        required: true,
        type: "string",
        aliases: ["location", "rtd location", "default location", "site", "office"],
        example: "San Francisco HQ",
      },
      {
        key: "manufacturer",
        label: "Manufacturer",
        required: true,
        type: "string",
        aliases: ["manufacturer", "brand", "vendor make", "oem"],
        example: "Apple",
      },
      {
        key: "supplier",
        label: "Supplier",
        required: true,
        type: "string",
        aliases: ["supplier", "vendor", "reseller"],
        example: "CDW Enterprise",
      },
      {
        key: "purchase_date",
        label: "Purchase Date",
        type: "date",
        aliases: ["purchase date", "purchased", "bought date", "purchase_date"],
        example: "2026-02-15",
      },
      {
        key: "purchase_cost",
        label: "Purchase Cost",
        type: "number",
        aliases: ["purchase cost", "cost", "unit cost", "price", "value", "purchase_cost"],
        example: "2499",
      },
      {
        key: "warranty",
        label: "Warranty (Months)",
        type: "number",
        aliases: ["warranty", "warranty months", "warranty_months"],
        example: "36",
      },
      {
        key: "eol_date",
        label: "EOL Date",
        type: "date",
        aliases: ["eol", "eol date", "asset_eol_date", "end of life"],
        example: "2029-02-15",
      },
      {
        key: "order_number",
        label: "Order / PO Number",
        type: "string",
        aliases: ["order number", "order_number", "po", "po number"],
        example: "PO-2026-884",
      },
      {
        key: "assigned_to_email",
        label: "Checkout To Email / Username",
        type: "string",
        aliases: ["assigned to", "checked out to", "checkout to", "assigned_to_email", "assignee", "email"],
        example: "alex.rivera@acme.com",
        hint: "Optionally checks out the asset to an existing Person by email or username.",
      },
      {
        key: "notes",
        label: "Notes",
        type: "string",
        aliases: ["notes", "comment", "comments", "description"],
        example: "Imported via Q1 hardware audit",
      },
    ],
  },
  people: {
    type: "people",
    label: "Person",
    pluralLabel: "People / Employees",
    description:
      "Import employee profiles with department, office location, company, employee numbers, and start/offboarding dates.",
    matchKeyLabel: "Username or Email",
    redirectHref: "/people",
    permissionKey: "canManagePeople",
    supportsAutoTaxonomy: true,
    fields: [
      {
        key: "name",
        label: "Full Name",
        required: true,
        type: "string",
        aliases: ["name", "full name", "display name", "employee name"],
        example: "Elena Rostova",
      },
      {
        key: "first_name",
        label: "First Name",
        type: "string",
        aliases: ["first name", "first_name", "given name"],
        example: "Elena",
      },
      {
        key: "last_name",
        label: "Last Name",
        type: "string",
        aliases: ["last name", "last_name", "surname", "family name"],
        example: "Rostova",
      },
      {
        key: "username",
        label: "Username",
        required: true,
        type: "string",
        aliases: ["username", "user name", "login", "handle"],
        example: "elena.rostova",
      },
      {
        key: "email",
        label: "Email Address",
        type: "string",
        aliases: ["email", "email address", "work email"],
        example: "elena.rostova@acme.com",
      },
      {
        key: "phone",
        label: "Phone",
        type: "string",
        aliases: ["phone", "phone number", "mobile"],
        example: "+1-555-0142",
      },
      {
        key: "title",
        label: "Job Title",
        type: "string",
        aliases: ["title", "job title", "job_title", "position", "role title"],
        example: "Senior Platform Engineer",
      },
      {
        key: "employee_num",
        label: "Employee Number",
        type: "string",
        aliases: ["employee num", "employee number", "employee #", "emp id", "employee_num", "badge"],
        example: "EMP-1084",
      },
      {
        key: "company",
        label: "Company",
        type: "string",
        aliases: ["company", "company name", "entity"],
        example: "Acme Corp",
      },
      {
        key: "department",
        label: "Department",
        type: "string",
        aliases: ["department", "dept", "team"],
        example: "Engineering",
      },
      {
        key: "location",
        label: "Location",
        type: "string",
        aliases: ["location", "office", "site"],
        example: "San Francisco HQ",
      },
      {
        key: "start_date",
        label: "Start Date",
        type: "date",
        aliases: ["start date", "start_date", "hire date", "joined"],
        example: "2024-03-01",
      },
      {
        key: "end_date",
        label: "Offboarding / End Date",
        type: "date",
        aliases: ["end date", "end_date", "termination date", "last day", "offboard date"],
        example: "2026-11-30",
      },
      {
        key: "notes",
        label: "Notes",
        type: "string",
        aliases: ["notes", "comment", "comments"],
        example: "Remote engineering team",
      },
    ],
  },
  license: {
    type: "license",
    label: "License",
    pluralLabel: "Software Licenses",
    description:
      "Import SaaS & software licenses with seat counts, product keys, renewal/expiration dates, and assignees.",
    matchKeyLabel: "License Name",
    redirectHref: "/licenses",
    permissionKey: "canCreateEditAssets",
    supportsAutoTaxonomy: true,
    fields: [
      {
        key: "name",
        label: "License Name",
        required: true,
        type: "string",
        aliases: ["name", "item name", "item_name", "software", "software name", "license name"],
        example: "JetBrains All Products Pack",
      },
      {
        key: "product_key",
        label: "Product Key / Serial",
        type: "string",
        aliases: ["product key", "serial", "key", "product_key", "license key"],
        example: "JB-9921-4402-XK10",
      },
      {
        key: "seats",
        label: "Total Seats",
        required: true,
        type: "number",
        aliases: ["seats", "total seats", "licenses", "qty"],
        example: "25",
      },
      {
        key: "seats_available",
        label: "Available Seats",
        type: "number",
        aliases: ["seats available", "seats_available", "remaining seats"],
        example: "24",
      },
      {
        key: "category",
        label: "Category",
        required: true,
        type: "string",
        aliases: ["category", "category name"],
        example: "Developer Tools",
      },
      {
        key: "company",
        label: "Company",
        required: true,
        type: "string",
        aliases: ["company", "company name"],
        example: "Acme Corp",
      },
      {
        key: "manufacturer",
        label: "Manufacturer / Publisher",
        required: true,
        type: "string",
        aliases: ["manufacturer", "publisher", "vendor make"],
        example: "JetBrains",
      },
      {
        key: "supplier",
        label: "Supplier",
        required: true,
        type: "string",
        aliases: ["supplier", "vendor", "reseller"],
        example: "Insight Software",
      },
      {
        key: "purchase_date",
        label: "Purchase Date",
        type: "date",
        aliases: ["purchase date", "purchase_date"],
        example: "2026-01-10",
      },
      {
        key: "expiry_date",
        label: "Expiration Date",
        type: "date",
        aliases: ["expiration date", "expiry date", "expiry_date", "expires"],
        example: "2027-01-10",
      },
      {
        key: "purchase_cost",
        label: "Purchase Cost",
        type: "number",
        aliases: ["purchase cost", "cost", "purchase_cost"],
        example: "6250",
      },
      {
        key: "order_number",
        label: "Order Number",
        type: "string",
        aliases: ["order number", "order_number", "po"],
        example: "PO-LIC-104",
      },
      {
        key: "license_to_name",
        label: "Licensed To Name",
        type: "string",
        aliases: ["licensed to", "license_to_name", "assignee name"],
        example: "Elena Rostova",
      },
      {
        key: "license_to_email",
        label: "Licensed To Email",
        type: "string",
        aliases: ["licensed to email", "license_to_email", "assignee email"],
        example: "elena.rostova@acme.com",
      },
    ],
  },
  accessory: {
    type: "accessory",
    label: "Accessory",
    pluralLabel: "Accessories",
    description:
      "Import keyboards, docks, monitors, headsets, and bulk stock quantities.",
    matchKeyLabel: "Accessory Name",
    redirectHref: "/accessories",
    permissionKey: "canCreateEditAssets",
    supportsAutoTaxonomy: true,
    fields: [
      {
        key: "name",
        label: "Accessory Name",
        required: true,
        type: "string",
        aliases: ["name", "item name", "item_name", "accessory name"],
        example: "Logitech MX Keys S",
      },
      {
        key: "qty",
        label: "Quantity",
        required: true,
        type: "number",
        aliases: ["qty", "quantity", "stock", "count"],
        example: "15",
      },
      {
        key: "category",
        label: "Category",
        required: true,
        type: "string",
        aliases: ["category", "category name"],
        example: "Keyboards & Mice",
      },
      {
        key: "company",
        label: "Company",
        required: true,
        type: "string",
        aliases: ["company", "company name"],
        example: "Acme Corp",
      },
      {
        key: "model_no",
        label: "Model Number",
        type: "string",
        aliases: ["model no", "model_no", "model number", "sku"],
        example: "920-011558",
      },
      {
        key: "min_amt",
        label: "Min Quantity Alert",
        type: "number",
        aliases: ["min qty", "min_amt", "min quantity"],
        example: "3",
      },
      {
        key: "manufacturer",
        label: "Manufacturer",
        type: "string",
        aliases: ["manufacturer", "brand"],
        example: "Logitech",
      },
      {
        key: "supplier",
        label: "Supplier",
        type: "string",
        aliases: ["supplier", "vendor"],
        example: "CDW Enterprise",
      },
      {
        key: "location",
        label: "Location",
        type: "string",
        aliases: ["location", "office"],
        example: "San Francisco HQ",
      },
      {
        key: "purchase_cost",
        label: "Unit Cost",
        type: "number",
        aliases: ["cost", "purchase cost", "purchase_cost", "unit cost"],
        example: "109",
      },
      {
        key: "purchase_date",
        label: "Purchase Date",
        type: "date",
        aliases: ["purchase date", "purchase_date"],
        example: "2026-03-01",
      },
      {
        key: "order_number",
        label: "Order Number",
        type: "string",
        aliases: ["order number", "order_number"],
        example: "PO-ACC-210",
      },
    ],
  },
  consumable: {
    type: "consumable",
    label: "Consumable",
    pluralLabel: "Consumables",
    description: "Import toner cartridges, cables, adapters, and office supplies.",
    matchKeyLabel: "Consumable Name",
    redirectHref: "/consumables",
    permissionKey: "canCreateEditAssets",
    supportsAutoTaxonomy: true,
    fields: [
      {
        key: "name",
        label: "Consumable Name",
        required: true,
        type: "string",
        aliases: ["name", "item name", "item_name", "consumable name"],
        example: "USB-C to USB-C 2m Cable",
      },
      {
        key: "qty",
        label: "Quantity",
        required: true,
        type: "number",
        aliases: ["qty", "quantity", "stock"],
        example: "40",
      },
      {
        key: "category",
        label: "Category",
        required: true,
        type: "string",
        aliases: ["category", "category name"],
        example: "Cables & Adapters",
      },
      {
        key: "company",
        label: "Company",
        required: true,
        type: "string",
        aliases: ["company", "company name"],
        example: "Acme Corp",
      },
      {
        key: "item_no",
        label: "Item Number / SKU",
        type: "string",
        aliases: ["item no", "item_no", "sku", "part number"],
        example: "USBC-2M-BLK",
      },
      {
        key: "min_amt",
        label: "Min Quantity Alert",
        type: "number",
        aliases: ["min qty", "min_amt"],
        example: "10",
      },
      {
        key: "manufacturer",
        label: "Manufacturer",
        type: "string",
        aliases: ["manufacturer", "brand"],
        example: "Anker",
      },
      {
        key: "supplier",
        label: "Supplier",
        type: "string",
        aliases: ["supplier", "vendor"],
        example: "Amazon Business",
      },
      {
        key: "location",
        label: "Location",
        type: "string",
        aliases: ["location"],
        example: "San Francisco HQ",
      },
      {
        key: "purchase_cost",
        label: "Unit Cost",
        type: "number",
        aliases: ["cost", "purchase cost", "purchase_cost"],
        example: "18",
      },
      {
        key: "purchase_date",
        label: "Purchase Date",
        type: "date",
        aliases: ["purchase date", "purchase_date"],
        example: "2026-03-05",
      },
      {
        key: "order_number",
        label: "Order Number",
        type: "string",
        aliases: ["order number", "order_number"],
        example: "PO-CON-098",
      },
    ],
  },
  component: {
    type: "component",
    label: "Component",
    pluralLabel: "Components",
    description:
      "Import internal hardware upgrades like NVMe SSDs, RAM kits, and network cards.",
    matchKeyLabel: "Component Name",
    redirectHref: "/components",
    permissionKey: "canCreateEditAssets",
    supportsAutoTaxonomy: true,
    fields: [
      {
        key: "name",
        label: "Component Name",
        required: true,
        type: "string",
        aliases: ["name", "item name", "item_name", "component name"],
        example: "Samsung 990 PRO 2TB NVMe SSD",
      },
      {
        key: "qty",
        label: "Quantity",
        required: true,
        type: "number",
        aliases: ["qty", "quantity", "stock"],
        example: "12",
      },
      {
        key: "category",
        label: "Category",
        required: true,
        type: "string",
        aliases: ["category", "category name"],
        example: "Storage Drives",
      },
      {
        key: "company",
        label: "Company",
        required: true,
        type: "string",
        aliases: ["company", "company name"],
        example: "Acme Corp",
      },
      {
        key: "serial_number",
        label: "Serial / Batch",
        type: "string",
        aliases: ["serial", "serial_number", "serial number"],
        example: "S73WNJ0W412001",
      },
      {
        key: "min_amt",
        label: "Min Quantity Alert",
        type: "number",
        aliases: ["min qty", "min_amt"],
        example: "2",
      },
      {
        key: "manufacturer",
        label: "Manufacturer",
        type: "string",
        aliases: ["manufacturer", "brand"],
        example: "Samsung",
      },
      {
        key: "supplier",
        label: "Supplier",
        type: "string",
        aliases: ["supplier", "vendor"],
        example: "CDW Enterprise",
      },
      {
        key: "location",
        label: "Location",
        type: "string",
        aliases: ["location"],
        example: "San Francisco HQ",
      },
      {
        key: "purchase_cost",
        label: "Unit Cost",
        type: "number",
        aliases: ["cost", "purchase cost", "purchase_cost"],
        example: "165",
      },
      {
        key: "purchase_date",
        label: "Purchase Date",
        type: "date",
        aliases: ["purchase date", "purchase_date"],
        example: "2026-03-10",
      },
      {
        key: "order_number",
        label: "Order Number",
        type: "string",
        aliases: ["order number", "order_number"],
        example: "PO-CMP-512",
      },
    ],
  },
  location: {
    type: "location",
    label: "Location",
    pluralLabel: "Locations",
    description: "Import offices, warehouses, data centers, and currencies.",
    matchKeyLabel: "Location Name",
    redirectHref: "/settings/location",
    permissionKey: "canManageSettings",
    supportsAutoTaxonomy: false,
    fields: [
      {
        key: "name",
        label: "Location Name",
        required: true,
        type: "string",
        aliases: ["name", "location", "location name", "site"],
        example: "Austin Innovation Hub",
      },
      {
        key: "currency",
        label: "Currency",
        type: "string",
        aliases: ["currency"],
        example: "USD",
      },
      {
        key: "address",
        label: "Address",
        type: "string",
        aliases: ["address", "street", "street address"],
        example: "500 W 2nd St",
      },
      {
        key: "city",
        label: "City",
        type: "string",
        aliases: ["city"],
        example: "Austin",
      },
      {
        key: "state",
        label: "State / Region",
        type: "string",
        aliases: ["state", "region", "province"],
        example: "TX",
      },
    ],
  },
  supplier: {
    type: "supplier",
    label: "Supplier",
    pluralLabel: "Suppliers",
    description: "Import approved vendors, procurement contacts, and support info.",
    matchKeyLabel: "Supplier Name",
    redirectHref: "/settings/supplier",
    permissionKey: "canManageSettings",
    supportsAutoTaxonomy: false,
    fields: [
      {
        key: "name",
        label: "Supplier Name",
        required: true,
        type: "string",
        aliases: ["name", "supplier", "supplier name", "vendor"],
        example: "CDW Enterprise",
      },
      {
        key: "contact_name",
        label: "Contact Name",
        required: true,
        type: "string",
        aliases: ["contact", "contact name", "contact_name"],
        example: "Jordan Blake",
      },
      {
        key: "email",
        label: "Email",
        required: true,
        type: "string",
        aliases: ["email", "contact email", "vendor email"],
        example: "orders@cdw-example.com",
      },
      {
        key: "phone",
        label: "Phone",
        required: true,
        type: "string",
        aliases: ["phone", "telephone", "contact phone"],
        example: "+1-800-555-0199",
      },
      {
        key: "address",
        label: "Address",
        required: true,
        type: "string",
        aliases: ["address", "street address"],
        example: "200 N Milwaukee Ave, Vernon Hills, IL",
      },
    ],
  },
  category: {
    type: "category",
    label: "Category",
    pluralLabel: "Categories",
    description:
      "Import inventory taxonomy categories (Asset, License, Accessory, Consumable, Component).",
    matchKeyLabel: "Category Name",
    redirectHref: "/settings/category",
    permissionKey: "canManageSettings",
    supportsAutoTaxonomy: false,
    fields: [
      {
        key: "name",
        label: "Category Name",
        required: true,
        type: "string",
        aliases: ["name", "category", "category name"],
        example: "Laptops",
      },
      {
        key: "type",
        label: "Category Type",
        required: true,
        type: "string",
        aliases: ["type", "category type"],
        example: "asset",
        hint: "e.g. asset, license, accessory, consumable, or component",
      },
      {
        key: "email",
        label: "Send Checkin Email",
        type: "boolean",
        aliases: ["email", "send email", "send_email", "checkin_email"],
        example: "true",
      },
    ],
  },
};

export const IMPORT_ENTITY_LIST: ImportEntitySchema[] = Object.values(IMPORT_ENTITY_SCHEMAS);

function normalizeHeaderToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Automatically maps spreadsheet headers (from CSV or Excel) onto target schema keys
 * using normalized exact matches and Snipe-IT compatible column aliases.
 */
export function autoMapSpreadsheetHeaders(
  headers: string[],
  entityType: ImportEntityType
): Record<string, string> {
  const schema = IMPORT_ENTITY_SCHEMAS[entityType];
  const mapping: Record<string, string> = {};
  const usedTargets = new Set<string>();

  for (const rawHeader of headers) {
    const cleanHeader = rawHeader.trim();
    if (!cleanHeader) continue;

    const norm = normalizeHeaderToken(cleanHeader);
    let matchedKey = "";

    // 1. Exact key or label match
    for (const field of schema.fields) {
      if (usedTargets.has(field.key)) continue;
      if (
        normalizeHeaderToken(field.key) === norm ||
        normalizeHeaderToken(field.label) === norm
      ) {
        matchedKey = field.key;
        break;
      }
    }

    // 2. Alias match
    if (!matchedKey) {
      for (const field of schema.fields) {
        if (usedTargets.has(field.key)) continue;
        if (field.aliases.some((alias) => normalizeHeaderToken(alias) === norm)) {
          matchedKey = field.key;
          break;
        }
      }
    }

    if (matchedKey) {
      usedTargets.add(matchedKey);
    }
    mapping[rawHeader] = matchedKey;
  }

  return mapping;
}

/**
 * Generates sample headers + example row for instant CSV / XLSX template downloads.
 */
export function buildSampleTemplateData(entityType: ImportEntityType): {
  headers: string[];
  rows: string[][];
} {
  const schema = IMPORT_ENTITY_SCHEMAS[entityType];
  const headers = schema.fields.map((f) => f.label);
  const exampleRow = schema.fields.map((f) => f.example);
  return {
    headers,
    rows: [exampleRow],
  };
}

