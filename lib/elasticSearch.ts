import dbconnect from "@/lib/dbconnect";
import { AccessoriesModel } from "@/models/Accessories.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";

export type EntityType =
  | "asset"
  | "person"
  | "license"
  | "accessory"
  | "component"
  | "consumable"
  | "setting";

export interface ElasticField {
  name: string;
  value: string;
  weight: number;
}

export interface IndexedDocument {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  tag?: string;
  badge?: string;
  meta?: string;
  href: string;
  fields: ElasticField[];
}

export interface ElasticHit {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  tag?: string;
  badge?: string;
  meta?: string;
  href: string;
  score: number;
  matchType: "exact" | "prefix" | "substring" | "fuzzy";
  matchedField?: string;
}

export interface ElasticSearchResponse {
  engine: "elasticsearch" | "elastic-local";
  tookMs: number;
  totalHits: number;
  query: string;
  facets: Record<EntityType, number>;
  hits: ElasticHit[];
}

interface IndexCache {
  docs: IndexedDocument[];
  updatedAt: number;
  refreshing: Promise<IndexedDocument[]> | null;
}

const CACHE_TTL_MS = 30_000; // 30 seconds in-memory index lifetime

const globalForElastic = globalThis as unknown as {
  _elasticWorkspaceCache?: Map<string, IndexCache>;
};

const workspaceCaches: Map<string, IndexCache> =
  globalForElastic._elasticWorkspaceCache ?? new Map<string, IndexCache>();

if (!globalForElastic._elasticWorkspaceCache) {
  globalForElastic._elasticWorkspaceCache = workspaceCaches;
}

function getOrCreateCache(workspaceId: string): IndexCache {
  let cache = workspaceCaches.get(workspaceId);
  if (!cache) {
    cache = {
      docs: [],
      updatedAt: 0,
      refreshing: null,
    };
    workspaceCaches.set(workspaceId, cache);
  }
  return cache;
}

/**
 * Call after major create/update/delete mutations to force immediate index refresh on next search.
 */
export function invalidateElasticIndexCache(workspaceId?: string): void {
  if (workspaceId) {
    const cache = workspaceCaches.get(workspaceId);
    if (cache) {
      cache.updatedAt = 0;
    }
    return;
  }
  for (const cache of workspaceCaches.values()) {
    cache.updatedAt = 0;
  }
}

/**
 * Optimal Damerau-Levenshtein edit distance supporting adjacent transpositions (e.g., "lpatop" -> "laptop").
 */
function damerauLevenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const d: number[][] = Array.from({ length: la + 1 }, () =>
    new Array<number>(lb + 1).fill(0)
  );

  for (let i = 0; i <= la; i++) d[i][0] = i;
  for (let j = 0; j <= lb; j++) d[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, d[i - 2][j - 2] + 1);
      }
      d[i][j] = val;
    }
  }
  return d[la][lb];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_.:/@,()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Build the complete multi-collection searchable index directly from MongoDB using fast parallel .lean() queries.
 */
async function buildSearchIndex(workspaceId: string): Promise<IndexedDocument[]> {
  await dbconnect();
  const scope = { userId: workspaceId };

  const [
    assets,
    people,
    licenses,
    accessories,
    components,
    consumables,
    companies,
    locations,
    departments,
    assetModels,
    manufacturers,
    suppliers,
    categories,
  ] = await Promise.all([
    AssetModel.find(scope)
      .select(
        "asset_tag serial_number asset_name order_number notes company asset_model status location department assigned_to purchase_cost"
      )
      .populate([
        { path: "company", select: "name" },
        { path: "asset_model", select: "name model_no" },
        { path: "status", select: "name type" },
        { path: "location", select: "name" },
        { path: "department", select: "name" },
        { path: "assigned_to", select: "name first_name last_name email" },
      ])
      .lean(),
    PeopleModel.find(scope)
      .select("name first_name last_name title email username employee_num department location company")
      .populate([
        { path: "department", select: "name" },
        { path: "location", select: "name" },
        { path: "company", select: "name" },
      ])
      .lean(),
    LicenseModel.find(scope)
      .select("name product_key license_to_name license_to_email order_number seats seats_available manufacturer category expiry_date")
      .populate([
        { path: "manufacturer", select: "name" },
        { path: "category", select: "name" },
      ])
      .lean(),
    AccessoriesModel.find(scope)
      .select("name model_no order_number qty category company location")
      .populate([
        { path: "category", select: "name" },
        { path: "company", select: "name" },
        { path: "location", select: "name" },
      ])
      .lean(),
    ComponentModel.find(scope)
      .select("name serial_number order_number qty category company location")
      .populate([
        { path: "category", select: "name" },
        { path: "company", select: "name" },
        { path: "location", select: "name" },
      ])
      .lean(),
    ConsumableModel.find(scope)
      .select("name item_no order_number qty category company location")
      .populate([
        { path: "category", select: "name" },
        { path: "company", select: "name" },
        { path: "location", select: "name" },
      ])
      .lean(),
    CompanyModel.find(scope).select("name email").lean(),
    LocationModel.find(scope).select("name city state currency").lean(),
    DepartmentModel.find(scope).select("name phone").lean(),
    AssetModel_Model.find(scope).select("name model_no").lean(),
    ManufacturerModel.find(scope).select("name support_email support_url").lean(),
    SupplierModel.find(scope).select("name contact_name email").lean(),
    CategoryModel.find(scope).select("name type").lean(),
  ]);

  const docs: IndexedDocument[] = [];

  // 1. Assets
  for (const a of assets as any[]) {
    const assigneeName = a.assigned_to?.name
      ? a.assigned_to.name
      : [a.assigned_to?.first_name, a.assigned_to?.last_name].filter(Boolean).join(" ");

    const subtitleParts = [
      a.asset_model?.name,
      a.serial_number ? `S/N: ${a.serial_number}` : null,
      assigneeName ? `Assigned: ${assigneeName}` : a.location?.name,
    ].filter(Boolean);

    docs.push({
      id: a._id.toString(),
      type: "asset",
      title: a.asset_name || a.asset_tag,
      tag: a.asset_tag,
      badge: a.status?.name || "Asset",
      subtitle: subtitleParts.join(" • "),
      meta: a.department?.name || a.company?.name,
      href: `/assets/listall?search=${encodeURIComponent(a.asset_tag)}`,
      fields: [
        { name: "asset_tag", value: a.asset_tag || "", weight: 4.5 },
        { name: "serial_number", value: a.serial_number || "", weight: 4.0 },
        { name: "asset_name", value: a.asset_name || "", weight: 3.5 },
        { name: "asset_model", value: a.asset_model?.name || "", weight: 2.2 },
        { name: "assigned_to", value: assigneeName || "", weight: 2.5 },
        { name: "assigned_email", value: a.assigned_to?.email || "", weight: 2.0 },
        { name: "status", value: a.status?.name || "", weight: 1.5 },
        { name: "location", value: a.location?.name || "", weight: 1.5 },
        { name: "department", value: a.department?.name || "", weight: 1.5 },
        { name: "company", value: a.company?.name || "", weight: 1.2 },
        { name: "order_number", value: a.order_number || "", weight: 2.0 },
        { name: "notes", value: a.notes || "", weight: 0.8 },
      ],
    });
  }

  // 2. People
  for (const p of people as any[]) {
    const fullName =
      p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username;
    const subtitleParts = [p.title, p.email, p.department?.name].filter(Boolean);

    docs.push({
      id: p._id.toString(),
      type: "person",
      title: fullName,
      tag: p.employee_num || (p.username ? `@${p.username}` : undefined),
      badge: p.location?.name || "Person",
      subtitle: subtitleParts.join(" • "),
      meta: p.company?.name,
      href: `/people/${p._id.toString()}`,
      fields: [
        { name: "name", value: fullName || "", weight: 4.0 },
        { name: "username", value: p.username || "", weight: 3.5 },
        { name: "email", value: p.email || "", weight: 3.5 },
        { name: "employee_num", value: p.employee_num || "", weight: 3.5 },
        { name: "title", value: p.title || "", weight: 2.0 },
        { name: "department", value: p.department?.name || "", weight: 1.5 },
        { name: "location", value: p.location?.name || "", weight: 1.5 },
        { name: "company", value: p.company?.name || "", weight: 1.2 },
      ],
    });
  }

  // 3. Licenses
  for (const l of licenses as any[]) {
    const totalSeats = Number(l.seats) || 1;
    const availSeats = l.seats_available ?? totalSeats;
    const usedSeats = Math.max(0, totalSeats - availSeats);
    const maskedKey =
      l.product_key && l.product_key.length > 6
        ? `•••${l.product_key.slice(-4)}`
        : l.product_key;

    docs.push({
      id: l._id.toString(),
      type: "license",
      title: l.name,
      tag: maskedKey,
      badge: `${usedSeats}/${totalSeats} seats`,
      subtitle: [l.manufacturer?.name, l.license_to_name || l.license_to_email]
        .filter(Boolean)
        .join(" • "),
      meta: l.category?.name,
      href: `/licenses?search=${encodeURIComponent(l.name)}`,
      fields: [
        { name: "name", value: l.name || "", weight: 4.0 },
        { name: "product_key", value: l.product_key || "", weight: 3.5 },
        { name: "license_to_name", value: l.license_to_name || "", weight: 2.5 },
        { name: "license_to_email", value: l.license_to_email || "", weight: 2.5 },
        { name: "manufacturer", value: l.manufacturer?.name || "", weight: 1.8 },
        { name: "order_number", value: l.order_number || "", weight: 1.5 },
        { name: "category", value: l.category?.name || "", weight: 1.2 },
      ],
    });
  }

  // 4. Accessories
  for (const acc of accessories as any[]) {
    docs.push({
      id: acc._id.toString(),
      type: "accessory",
      title: acc.name,
      tag: acc.model_no,
      badge: `Qty: ${acc.qty ?? 0}`,
      subtitle: [acc.category?.name, acc.location?.name, acc.company?.name]
        .filter(Boolean)
        .join(" • "),
      href: `/accessories?search=${encodeURIComponent(acc.name)}`,
      fields: [
        { name: "name", value: acc.name || "", weight: 4.0 },
        { name: "model_no", value: acc.model_no || "", weight: 2.5 },
        { name: "order_number", value: acc.order_number || "", weight: 1.5 },
        { name: "category", value: acc.category?.name || "", weight: 1.5 },
        { name: "location", value: acc.location?.name || "", weight: 1.2 },
      ],
    });
  }

  // 5. Components
  for (const comp of components as any[]) {
    docs.push({
      id: comp._id.toString(),
      type: "component",
      title: comp.name,
      tag: comp.serial_number,
      badge: `Qty: ${comp.qty ?? 0}`,
      subtitle: [comp.category?.name, comp.location?.name, comp.company?.name]
        .filter(Boolean)
        .join(" • "),
      href: `/components?search=${encodeURIComponent(comp.name)}`,
      fields: [
        { name: "name", value: comp.name || "", weight: 4.0 },
        { name: "serial_number", value: comp.serial_number || "", weight: 3.0 },
        { name: "order_number", value: comp.order_number || "", weight: 1.5 },
        { name: "category", value: comp.category?.name || "", weight: 1.5 },
        { name: "location", value: comp.location?.name || "", weight: 1.2 },
      ],
    });
  }

  // 6. Consumables
  for (const con of consumables as any[]) {
    docs.push({
      id: con._id.toString(),
      type: "consumable",
      title: con.name,
      tag: con.item_no,
      badge: `Qty: ${con.qty ?? 0}`,
      subtitle: [con.category?.name, con.location?.name, con.company?.name]
        .filter(Boolean)
        .join(" • "),
      href: `/consumables?search=${encodeURIComponent(con.name)}`,
      fields: [
        { name: "name", value: con.name || "", weight: 4.0 },
        { name: "item_no", value: con.item_no || "", weight: 2.5 },
        { name: "order_number", value: con.order_number || "", weight: 1.5 },
        { name: "category", value: con.category?.name || "", weight: 1.5 },
        { name: "location", value: con.location?.name || "", weight: 1.2 },
      ],
    });
  }

  // 7. Settings & Directory Entities
  for (const c of companies as any[]) {
    docs.push({
      id: c._id.toString(),
      type: "setting",
      title: c.name,
      badge: "Company",
      subtitle: c.email,
      href: "/settings/company",
      fields: [
        { name: "name", value: c.name || "", weight: 3.0 },
        { name: "email", value: c.email || "", weight: 1.5 },
        { name: "category", value: "company", weight: 1.0 },
      ],
    });
  }
  for (const loc of locations as any[]) {
    docs.push({
      id: loc._id.toString(),
      type: "setting",
      title: loc.name,
      badge: "Location",
      subtitle: [loc.city, loc.state].filter(Boolean).join(", "),
      href: "/settings/location",
      fields: [
        { name: "name", value: loc.name || "", weight: 3.0 },
        { name: "city", value: loc.city || "", weight: 1.5 },
        { name: "state", value: loc.state || "", weight: 1.5 },
        { name: "category", value: "location", weight: 1.0 },
      ],
    });
  }
  for (const d of departments as any[]) {
    docs.push({
      id: d._id.toString(),
      type: "setting",
      title: d.name,
      badge: "Department",
      subtitle: d.phone,
      href: "/settings/department",
      fields: [
        { name: "name", value: d.name || "", weight: 3.0 },
        { name: "category", value: "department", weight: 1.0 },
      ],
    });
  }
  for (const m of assetModels as any[]) {
    docs.push({
      id: m._id.toString(),
      type: "setting",
      title: m.name,
      tag: m.model_no,
      badge: "Asset Model",
      href: "/settings/assetmodel",
      fields: [
        { name: "name", value: m.name || "", weight: 3.0 },
        { name: "model_no", value: m.model_no || "", weight: 2.5 },
        { name: "category", value: "asset model", weight: 1.0 },
      ],
    });
  }
  for (const mfr of manufacturers as any[]) {
    docs.push({
      id: mfr._id.toString(),
      type: "setting",
      title: mfr.name,
      badge: "Manufacturer",
      subtitle: mfr.support_email || mfr.support_url,
      href: "/settings/manufacturer",
      fields: [
        { name: "name", value: mfr.name || "", weight: 3.0 },
        { name: "category", value: "manufacturer", weight: 1.0 },
      ],
    });
  }
  for (const sup of suppliers as any[]) {
    docs.push({
      id: sup._id.toString(),
      type: "setting",
      title: sup.name,
      badge: "Supplier",
      subtitle: [sup.contact_name, sup.email].filter(Boolean).join(" • "),
      href: "/settings/supplier",
      fields: [
        { name: "name", value: sup.name || "", weight: 3.0 },
        { name: "contact", value: sup.contact_name || "", weight: 1.5 },
        { name: "category", value: "supplier", weight: 1.0 },
      ],
    });
  }
  for (const cat of categories as any[]) {
    docs.push({
      id: cat._id.toString(),
      type: "setting",
      title: cat.name,
      badge: `Category (${cat.type})`,
      href: "/settings/category",
      fields: [
        { name: "name", value: cat.name || "", weight: 3.0 },
        { name: "type", value: cat.type || "", weight: 1.2 },
      ],
    });
  }

  return docs;
}

async function getCachedDocs(workspaceId: string, forceRefresh = false): Promise<IndexedDocument[]> {
  const cache = getOrCreateCache(workspaceId);
  const now = Date.now();
  if (!forceRefresh && cache.updatedAt > 0 && now - cache.updatedAt < CACHE_TTL_MS) {
    return cache.docs;
  }

  if (!cache.refreshing) {
    cache.refreshing = buildSearchIndex(workspaceId)
      .then((docs) => {
        cache.docs = docs;
        cache.updatedAt = Date.now();
        cache.refreshing = null;
        return docs;
      })
      .catch((err) => {
        cache.refreshing = null;
        throw err;
      });
  }

  return cache.refreshing;
}

/**
 * Score a document against tokenized query with Exact, Prefix, Substring, and Damerau-Levenshtein Fuzzy matching.
 */
function scoreDocument(
  doc: IndexedDocument,
  rawQueryLower: string,
  tokens: string[]
): { score: number; matchType: "exact" | "prefix" | "substring" | "fuzzy"; matchedField?: string } | null {
  let totalScore = 0;
  let bestMatchType: "exact" | "prefix" | "substring" | "fuzzy" = "fuzzy";
  let bestMatchedField: string | undefined;
  let bestFieldScore = 0;
  let matchedTokenCount = 0;

  const updateBest = (
    type: "exact" | "prefix" | "substring" | "fuzzy",
    fieldName: string,
    score: number
  ) => {
    const rank = { exact: 4, prefix: 3, substring: 2, fuzzy: 1 };
    if (rank[type] > rank[bestMatchType] || (rank[type] === rank[bestMatchType] && score > bestFieldScore)) {
      bestMatchType = type;
      bestMatchedField = fieldName;
      bestFieldScore = score;
    }
  };

  // Full phrase check on high-value fields
  for (const field of doc.fields) {
    if (!field.value) continue;
    const valLower = field.value.toLowerCase();
    if (valLower === rawQueryLower) {
      const s = 150 * field.weight;
      totalScore += s;
      updateBest("exact", field.name, s);
    } else if (valLower.startsWith(rawQueryLower)) {
      const s = 90 * field.weight;
      totalScore += s;
      updateBest("prefix", field.name, s);
    } else if (rawQueryLower.length >= 2 && valLower.includes(rawQueryLower)) {
      const s = 55 * field.weight;
      totalScore += s;
      updateBest("substring", field.name, s);
    }
  }

  // Per-token scoring (supports cross-field matches like "macbook rishabh" or fuzzy typos like "makbook")
  for (const token of tokens) {
    let tokenBestScore = 0;

    for (const field of doc.fields) {
      if (!field.value) continue;
      const valLower = field.value.toLowerCase();
      const words = tokenize(valLower);
      let fieldMatchScore = 0;

      if (valLower === token) {
        fieldMatchScore = 100 * field.weight;
        updateBest("exact", field.name, fieldMatchScore);
      } else if (words.some((w) => w === token)) {
        fieldMatchScore = 80 * field.weight;
        updateBest("exact", field.name, fieldMatchScore);
      } else if (valLower.startsWith(token) || words.some((w) => w.startsWith(token))) {
        fieldMatchScore = 55 * field.weight;
        updateBest("prefix", field.name, fieldMatchScore);
      } else if (valLower.includes(token)) {
        fieldMatchScore = 35 * field.weight;
        updateBest("substring", field.name, fieldMatchScore);
      } else if (token.length >= 3) {
        // Fuzzy typo tolerance via Damerau-Levenshtein distance
        const maxDist = token.length <= 4 ? 1 : 2;
        for (const word of words) {
          if (Math.abs(word.length - token.length) > maxDist) continue;
          const dist = damerauLevenshtein(token, word);
          if (dist <= maxDist) {
            const s = Math.max(8, 25 - dist * 8) * field.weight;
            if (s > fieldMatchScore) {
              fieldMatchScore = s;
              updateBest("fuzzy", field.name, s);
            }
          }
        }
      }

      if (fieldMatchScore > tokenBestScore) {
        tokenBestScore = fieldMatchScore;
      }
    }

    if (tokenBestScore > 0) {
      matchedTokenCount++;
      totalScore += tokenBestScore;
    }
  }

  if (totalScore === 0) return null;

  // Require at least half of tokens to match for multi-word queries, and boost 100% token coverage
  if (tokens.length > 1) {
    if (matchedTokenCount === tokens.length) {
      totalScore *= 1.5;
    } else if (matchedTokenCount / tokens.length < 0.5) {
      return null;
    }
  }

  return {
    score: Math.round(totalScore * 10) / 10,
    matchType: bestMatchType,
    matchedField: bestMatchedField,
  };
}

/**
 * Queries an external Elasticsearch cluster if ELASTICSEARCH_URL is configured.
 */
async function queryExternalElasticsearch(
  query: string,
  typeFilter: EntityType | "all",
  limit: number,
  workspaceId: string
): Promise<ElasticSearchResponse | null> {
  const esUrl = process.env.ELASTICSEARCH_URL;
  if (!esUrl) return null;

  const esIndex = process.env.ELASTICSEARCH_INDEX || "assetsvista";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.ELASTICSEARCH_API_KEY) {
    headers["Authorization"] = `ApiKey ${process.env.ELASTICSEARCH_API_KEY}`;
  }

  const mustQuery: any = {
    multi_match: {
      query,
      fields: [
        "tag^4",
        "title^3",
        "subtitle^2",
        "meta",
        "search_text",
      ],
      fuzziness: "AUTO",
      prefix_length: 1,
    },
  };

  const filters: any[] = [{ term: { "workspaceId.keyword": workspaceId } }];
  if (typeFilter !== "all") {
    filters.push({ term: { type: typeFilter } });
  }

  const body: any = {
    size: limit,
    query: {
      bool: {
        must: [mustQuery],
        filter: filters,
      },
    },
    aggs: {
      by_type: { terms: { field: "type" } },
    },
  };

  const startedAt = Date.now();
  const res = await fetch(`${esUrl.replace(/\/$/, "")}/${esIndex}/_search`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2500),
  });

  if (!res.ok) return null;

  const json = await res.json();
  const facets: Record<EntityType, number> = {
    asset: 0,
    person: 0,
    license: 0,
    accessory: 0,
    component: 0,
    consumable: 0,
    setting: 0,
  };

  for (const bucket of json.aggregations?.by_type?.buckets || []) {
    if (bucket.key in facets) {
      facets[bucket.key as EntityType] = bucket.doc_count;
    }
  }

  const hits: ElasticHit[] = (json.hits?.hits || []).map((h: any) => ({
    id: h._id,
    type: h._source.type,
    title: h._source.title,
    subtitle: h._source.subtitle,
    tag: h._source.tag,
    badge: h._source.badge,
    meta: h._source.meta,
    href: h._source.href,
    score: h._score || 0,
    matchType: "fuzzy",
  }));

  return {
    engine: "elasticsearch",
    tookMs: json.took ?? Date.now() - startedAt,
    totalHits: typeof json.hits?.total === "number" ? json.hits.total : json.hits?.total?.value || hits.length,
    query,
    facets,
    hits,
  };
}

/**
 * Primary Elastic Search entry point. Automatically uses Elasticsearch cluster if configured,
 * otherwise executes fast in-memory + MongoDB elastic fuzzy search.
 */
export async function executeElasticSearch(options: {
  query: string;
  workspaceId: string;
  type?: EntityType | "all";
  limit?: number;
  refresh?: boolean;
}): Promise<ElasticSearchResponse> {
  const startedAt = Date.now();
  const rawQuery = options.query.trim();
  const typeFilter = options.type || "all";
  const limit = Math.min(Math.max(options.limit || 25, 1), 60);

  const emptyFacets: Record<EntityType, number> = {
    asset: 0,
    person: 0,
    license: 0,
    accessory: 0,
    component: 0,
    consumable: 0,
    setting: 0,
  };

  if (!rawQuery) {
    return {
      engine: process.env.ELASTICSEARCH_URL ? "elasticsearch" : "elastic-local",
      tookMs: 0,
      totalHits: 0,
      query: "",
      facets: emptyFacets,
      hits: [],
    };
  }

  // Try external Elasticsearch first if configured
  if (process.env.ELASTICSEARCH_URL) {
    try {
      const esRes = await queryExternalElasticsearch(
        rawQuery,
        typeFilter,
        limit,
        options.workspaceId
      );
      if (esRes) return esRes;
    } catch (err) {
      console.warn("External Elasticsearch query failed, falling back to local elastic engine:", err);
    }
  }

  const docs = await getCachedDocs(options.workspaceId, options.refresh);
  const rawQueryLower = rawQuery.toLowerCase();
  const tokens = tokenize(rawQueryLower);

  const facets: Record<EntityType, number> = { ...emptyFacets };
  const allMatches: ElasticHit[] = [];

  for (const doc of docs) {
    const scored = scoreDocument(doc, rawQueryLower, tokens);
    if (!scored) continue;

    facets[doc.type]++;

    if (typeFilter === "all" || doc.type === typeFilter) {
      allMatches.push({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        subtitle: doc.subtitle,
        tag: doc.tag,
        badge: doc.badge,
        meta: doc.meta,
        href: doc.href,
        score: scored.score,
        matchType: scored.matchType,
        matchedField: scored.matchedField,
      });
    }
  }

  allMatches.sort((a, b) => b.score - a.score);

  return {
    engine: "elastic-local",
    tookMs: Date.now() - startedAt,
    totalHits: allMatches.length,
    query: rawQuery,
    facets,
    hits: allMatches.slice(0, limit),
  };
}

/**
 * Syncs all searchable documents into an external Elasticsearch cluster via Bulk API,
 * or warms the local in-memory search index.
 */
export async function syncSearchIndex(workspaceId: string): Promise<{
  indexedCount: number;
  engine: "elasticsearch" | "elastic-local";
  tookMs: number;
}> {
  const startedAt = Date.now();
  const docs = await getCachedDocs(workspaceId, true);

  const esUrl = process.env.ELASTICSEARCH_URL;
  if (!esUrl) {
    return {
      indexedCount: docs.length,
      engine: "elastic-local",
      tookMs: Date.now() - startedAt,
    };
  }

  const esIndex = process.env.ELASTICSEARCH_INDEX || "assetsvista";
  const headers: Record<string, string> = {
    "Content-Type": "application/x-ndjson",
  };
  if (process.env.ELASTICSEARCH_API_KEY) {
    headers["Authorization"] = `ApiKey ${process.env.ELASTICSEARCH_API_KEY}`;
  }

  // Construct NDJSON bulk payload
  const lines: string[] = [];
  for (const doc of docs) {
    lines.push(
      JSON.stringify({
        index: { _index: esIndex, _id: `${workspaceId}_${doc.type}_${doc.id}` },
      })
    );
    lines.push(
      JSON.stringify({
        workspaceId,
        id: doc.id,
        type: doc.type,
        title: doc.title,
        subtitle: doc.subtitle || "",
        tag: doc.tag || "",
        badge: doc.badge || "",
        meta: doc.meta || "",
        href: doc.href,
        search_text: doc.fields.map((f) => f.value).filter(Boolean).join(" "),
      })
    );
  }

  const res = await fetch(`${esUrl.replace(/\/$/, "")}/_bulk`, {
    method: "POST",
    headers,
    body: lines.join("\n") + "\n",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Elasticsearch bulk sync failed with status ${res.status}`);
  }

  return {
    indexedCount: docs.length,
    engine: "elasticsearch",
    tookMs: Date.now() - startedAt,
  };
}

