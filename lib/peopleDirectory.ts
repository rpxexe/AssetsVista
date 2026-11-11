import { ApiKeyModel } from "@/models/ApiKey.model";
import { AssetModel } from "@/models/Assets.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import UserModel from "@/models/Users.model";
import { normalizeUserRole, UserRole } from "@/lib/rbac";

export type PeopleFilterType =
  | "all"
  | "superusers"
  | "admins"
  | "login_enabled"
  | "login_disabled"
  | "offboarding";

export interface EnrichedPersonRow {
  _id: string;
  userId?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  phone?: string;
  username?: string;
  department?: { _id?: unknown; name?: string } | null;
  location?: { _id?: unknown; name?: string } | null;
  company?: { _id?: unknown; name?: string } | null;
  employee_num?: string;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  notes?: string;
  image?: string;
  deletedAt?: string | Date | null;
  deletedBy?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  assets_count: number;
  total_asset_value: number;
  licenses_count: number;
  active_api_keys_count: number;
  user_id: string | null;
  role: UserRole | null;
  isActive: boolean | null;
  lastLogin: string | Date | null;
  is_account_only?: boolean;
  is_overdue: boolean;
  days_remaining: number | null;
  needs_clearance: boolean;
  offboarding_risk: "cleared" | "warning" | "critical";
}

export interface PeopleSidebarCounts {
  total: number;
  superusers: number;
  admins: number;
  deleted: number;
  loginEnabled: number;
  loginDisabled: number;
  offboardingSoon: number;
  offboardingAtRisk: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildAuthUsersWorkspaceQuery(workspaceId: string) {
  return {
    $or: [
      { workspaceId },
      { clerkId: workspaceId, workspaceId: { $exists: false } },
    ],
  };
}

/**
 * Loads active or soft-deleted People enriched with assigned assets/value,
 * licenses, linked auth account roles/status, active API keys, and offboarding risk.
 */
export async function fetchEnrichedPeople(opts: {
  workspaceId: string;
  search?: string | null;
  deletedOnly?: boolean;
  filter?: string | null;
  endDateWithin?: number;
  withAssignments?: boolean;
  includeClearedPast?: boolean;
}): Promise<EnrichedPersonRow[]> {
  const {
    workspaceId,
    search,
    deletedOnly = false,
    filter = "all",
    endDateWithin = 0,
    withAssignments = false,
    includeClearedPast = false,
  } = opts;

  const peopleQuery: Record<string, unknown> = {
    userId: workspaceId,
    deletedAt: deletedOnly ? { $ne: null } : null,
  };

  const cleanSearch = search?.trim() || "";
  if (cleanSearch) {
    peopleQuery.$or = [
      { name: { $regex: cleanSearch, $options: "i" } },
      { first_name: { $regex: cleanSearch, $options: "i" } },
      { last_name: { $regex: cleanSearch, $options: "i" } },
      { email: { $regex: cleanSearch, $options: "i" } },
      { username: { $regex: cleanSearch, $options: "i" } },
      { employee_num: { $regex: cleanSearch, $options: "i" } },
    ];
  }

  const now = new Date();

  const [
    people,
    allPersonEmailsRaw,
    assetStats,
    licenses,
    authUsers,
    activeApiKeyStats,
  ] = await Promise.all([
    PeopleModel.find(peopleQuery)
      .sort(deletedOnly ? { deletedAt: -1, createdAt: -1 } : { createdAt: -1 })
      .populate([
        { path: "department", select: "name" },
        { path: "location", select: "name" },
        { path: "company", select: "name" },
      ])
      .lean<any[]>(),
    deletedOnly
      ? Promise.resolve([])
      : PeopleModel.find({ userId: workspaceId }, null, { includeDeleted: true })
          .select("_id email")
          .lean<Array<{ _id: unknown; email?: string }>>(),
    AssetModel.aggregate([
      { $match: { userId: workspaceId, assigned_to: { $ne: null } } },
      {
        $group: {
          _id: "$assigned_to",
          count: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ["$purchase_cost", 0] } },
        },
      },
    ]),
    LicenseModel.find({
      userId: workspaceId,
      $or: [
        { license_to_name: { $exists: true, $ne: "" } },
        { license_to_email: { $exists: true, $ne: "" } },
      ],
    })
      .select("_id license_to_name license_to_email")
      .lean<Array<{ _id: unknown; license_to_name?: string; license_to_email?: string }>>(),
    UserModel.find(buildAuthUsersWorkspaceQuery(workspaceId))
      .select("_id email name first_name last_name username role isActive lastLogin personId")
      .lean<any[]>(),
    ApiKeyModel.aggregate([
      {
        $match: {
          workspaceId,
          revokedAt: null,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
        },
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
  ]);

  const assetMap = new Map<string, { count: number; totalValue: number }>();
  for (const row of assetStats) {
    if (row._id) {
      assetMap.set(String(row._id), {
        count: Number(row.count || 0),
        totalValue: Number(row.totalValue || 0),
      });
    }
  }

  const apiKeyCountByUserId = new Map<string, number>();
  for (const row of activeApiKeyStats) {
    if (row._id) {
      apiKeyCountByUserId.set(String(row._id), Number(row.count || 0));
    }
  }

  const userByPersonId = new Map<string, any>();
  const userByEmail = new Map<string, any>();
  for (const u of authUsers) {
    if (u.personId) userByPersonId.set(String(u.personId), u);
    if (u.email) userByEmail.set(String(u.email).trim().toLowerCase(), u);
  }

  const licensesByName = new Map<string, Set<string>>();
  const licensesByEmail = new Map<string, Set<string>>();
  for (const lic of licenses) {
    const licId = String(lic._id);
    if (lic.license_to_name) {
      const k = lic.license_to_name.trim().toLowerCase();
      if (!licensesByName.has(k)) licensesByName.set(k, new Set());
      licensesByName.get(k)!.add(licId);
    }
    if (lic.license_to_email) {
      const k = lic.license_to_email.trim().toLowerCase();
      if (!licensesByEmail.has(k)) licensesByEmail.set(k, new Set());
      licensesByEmail.get(k)!.add(licId);
    }
  }

  const todayStart = getTodayStart();
  const matchedUserIds = new Set<string>();
  const allKnownEmails = new Set<string>();
  const allKnownPersonIds = new Set<string>();

  for (const row of allPersonEmailsRaw) {
    if (row._id) allKnownPersonIds.add(String(row._id));
    if (row.email) allKnownEmails.add(row.email.trim().toLowerCase());
  }

  const computeOffboardingMeta = (args: {
    endDate?: Date | string | null;
    assetsCount: number;
    licensesCount: number;
    isActive: boolean | null;
    apiKeysCount: number;
  }) => {
    let isOverdue = false;
    let daysRemaining: number | null = null;
    if (args.endDate) {
      const parsed = new Date(args.endDate);
      if (!Number.isNaN(parsed.getTime())) {
        const endDay = new Date(parsed);
        endDay.setHours(0, 0, 0, 0);
        daysRemaining = Math.round((endDay.getTime() - todayStart.getTime()) / MS_PER_DAY);
        isOverdue = daysRemaining < 0;
      }
    }

    const hasAssets = args.assetsCount > 0;
    const hasLoginOrTokens = args.isActive === true || args.apiKeysCount > 0;
    const hasLicenses = args.licensesCount > 0;
    const needsClearance = hasAssets || hasLicenses || hasLoginOrTokens;

    const risk: "cleared" | "warning" | "critical" = !needsClearance
      ? "cleared"
      : hasAssets || (isOverdue && hasLoginOrTokens)
      ? "critical"
      : "warning";

    return { isOverdue, daysRemaining, needsClearance, risk };
  };

  const enriched: EnrichedPersonRow[] = people.map((p) => {
    const pId = String(p._id);
    const assetSummary = assetMap.get(pId) ?? { count: 0, totalValue: 0 };

    const matchedLicenseIds = new Set<string>();
    if (p.name) {
      const byName = licensesByName.get(String(p.name).trim().toLowerCase());
      if (byName) for (const id of byName) matchedLicenseIds.add(id);
    }
    if (p.email) {
      const byEmail = licensesByEmail.get(String(p.email).trim().toLowerCase());
      if (byEmail) for (const id of byEmail) matchedLicenseIds.add(id);
    }

    const linkedUser =
      userByPersonId.get(pId) ||
      (p.email ? userByEmail.get(String(p.email).trim().toLowerCase()) : undefined);

    if (linkedUser?._id) {
      matchedUserIds.add(String(linkedUser._id));
    }

    const userIdStr = linkedUser?._id ? String(linkedUser._id) : null;
    const isActive = linkedUser ? linkedUser.isActive !== false : null;
    const apiKeysCount = userIdStr ? apiKeyCountByUserId.get(userIdStr) ?? 0 : 0;

    const meta = computeOffboardingMeta({
      endDate: p.end_date,
      assetsCount: assetSummary.count,
      licensesCount: matchedLicenseIds.size,
      isActive,
      apiKeysCount,
    });

    return {
      ...p,
      _id: pId,
      assets_count: assetSummary.count,
      total_asset_value: assetSummary.totalValue,
      licenses_count: matchedLicenseIds.size,
      active_api_keys_count: apiKeysCount,
      user_id: userIdStr,
      role: linkedUser?.role ? normalizeUserRole(linkedUser.role) : null,
      isActive,
      lastLogin: linkedUser?.lastLogin || null,
      is_overdue: meta.isOverdue,
      days_remaining: meta.daysRemaining,
      needs_clearance: meta.needsClearance,
      offboarding_risk: meta.risk,
    };
  });

  // Include active workspace auth users who do not yet have a PeopleModel row
  // (e.g. brand-new registered Admins prior to directory import) for auth/role filters
  // so Superusers/Login Enabled views never appear misleadingly empty.
  if (
    !deletedOnly &&
    (filter === "superusers" ||
      filter === "admins" ||
      filter === "login_enabled" ||
      filter === "login_disabled")
  ) {
    for (const u of authUsers) {
      const uid = String(u._id);
      const emailKey = String(u.email || "").trim().toLowerCase();
      const linkedPid = u.personId ? String(u.personId) : "";
      if (
        matchedUserIds.has(uid) ||
        (emailKey && allKnownEmails.has(emailKey)) ||
        (linkedPid && allKnownPersonIds.has(linkedPid))
      ) {
        continue;
      }

      if (cleanSearch) {
        const hay = `${u.name || ""} ${u.email || ""} ${u.username || ""}`.toLowerCase();
        if (!hay.includes(cleanSearch.toLowerCase())) continue;
      }

      const role = normalizeUserRole(u.role);
      const isActive = u.isActive !== false;
      const apiKeysCount = apiKeyCountByUserId.get(uid) ?? 0;

      enriched.push({
        _id: `account-${uid}`,
        userId: workspaceId,
        name: u.name || u.username || u.email || "Workspace User",
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        username: u.username,
        assets_count: 0,
        total_asset_value: 0,
        licenses_count: 0,
        active_api_keys_count: apiKeysCount,
        user_id: uid,
        role,
        isActive,
        lastLogin: u.lastLogin || null,
        is_account_only: true,
        is_overdue: false,
        days_remaining: null,
        needs_clearance: isActive || apiKeysCount > 0,
        offboarding_risk: "cleared",
      });
    }
  }

  let rows = enriched;

  if (!deletedOnly) {
    const windowDays = endDateWithin > 0 ? endDateWithin : filter === "offboarding" ? 30 : 0;

    if (filter === "superusers") {
      rows = rows.filter((r) => r.role === "admin");
    } else if (filter === "admins") {
      rows = rows.filter((r) => r.role === "admin" || r.role === "assets_user");
    } else if (filter === "login_enabled") {
      rows = rows.filter((r) => Boolean(r.user_id) && r.isActive === true);
    } else if (filter === "login_disabled") {
      rows = rows.filter((r) => !r.user_id || r.isActive === false);
    } else if (filter === "offboarding" || windowDays > 0) {
      rows = rows.filter((r) => {
        if (!r.end_date || r.days_remaining === null) return false;
        if (r.days_remaining < 0) {
          return includeClearedPast ? true : r.needs_clearance;
        }
        return r.days_remaining <= windowDays;
      });
      rows.sort((a, b) => (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999));
    }
  }

  if (withAssignments) {
    rows = rows.filter((r) => r.assets_count > 0 || r.licenses_count > 0);
  }

  return rows;
}

/**
 * Computes consistent People sidebar counts matching directory & auth filters.
 */
export async function computePeopleSidebarCounts(
  workspaceId: string
): Promise<PeopleSidebarCounts> {
  const [activeRows, deletedCount] = await Promise.all([
    fetchEnrichedPeople({ workspaceId }),
    PeopleModel.countDocuments({ userId: workspaceId, deletedAt: { $ne: null } }),
  ]);

  const authUsers = await UserModel.find(buildAuthUsersWorkspaceQuery(workspaceId))
    .select("_id email role isActive personId")
    .lean<Array<{ _id: unknown; email?: string; role?: string; isActive?: boolean; personId?: unknown }>>();

  const linkedUserIds = new Set(
    activeRows.map((r) => r.user_id).filter((x): x is string => Boolean(x))
  );

  // Also include deleted emails/personIds so Trash accounts don't count as unlinked active accounts
  const knownPersonRecords = await PeopleModel.find(
    { userId: workspaceId },
    null,
    { includeDeleted: true }
  )
    .select("_id email")
    .lean<Array<{ _id: unknown; email?: string }>>();

  const knownIds = new Set(knownPersonRecords.map((p) => String(p._id)));
  const knownEmails = new Set(
    knownPersonRecords
      .map((p) => p.email?.trim().toLowerCase())
      .filter((x): x is string => Boolean(x))
  );

  let superusers = 0;
  let admins = 0;
  let loginEnabled = 0;
  let loginDisabled = 0;
  let offboardingSoon = 0;
  let offboardingAtRisk = 0;

  for (const r of activeRows) {
    if (r.role === "admin") superusers += 1;
    if (r.role === "admin" || r.role === "assets_user") admins += 1;
    if (r.user_id && r.isActive === true) {
      loginEnabled += 1;
    } else {
      loginDisabled += 1;
    }

    if (r.days_remaining !== null) {
      const inUpcomingWindow = r.days_remaining >= 0 && r.days_remaining <= 30;
      const overdueUnresolved = r.days_remaining < 0 && r.needs_clearance;
      if (inUpcomingWindow || overdueUnresolved) {
        offboardingSoon += 1;
        if (r.needs_clearance) offboardingAtRisk += 1;
      }
    }
  }

  for (const u of authUsers) {
    const uid = String(u._id);
    const emailKey = u.email?.trim().toLowerCase() || "";
    const pid = u.personId ? String(u.personId) : "";
    if (
      linkedUserIds.has(uid) ||
      (pid && knownIds.has(pid)) ||
      (emailKey && knownEmails.has(emailKey))
    ) {
      continue;
    }
    const role = normalizeUserRole(u.role);
    if (role === "admin") superusers += 1;
    if (role === "admin" || role === "assets_user") admins += 1;
    if (u.isActive !== false) loginEnabled += 1;
    else loginDisabled += 1;
  }

  return {
    total: activeRows.length,
    superusers,
    admins,
    deleted: deletedCount,
    loginEnabled,
    loginDisabled,
    offboardingSoon,
    offboardingAtRisk,
  };
}

