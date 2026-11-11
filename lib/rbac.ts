export type UserRole = "admin" | "assets_user" | "requester";

export const USER_ROLES: UserRole[] = ["admin", "assets_user", "requester"];

export interface RolePermissions {
  canViewAssets: boolean;
  canCreateEditAssets: boolean;
  canDeleteAssets: boolean;
  canCheckoutCheckin: boolean;
  canAuditAssets: boolean;
  canManageMaintenances: boolean;
  canRequestItems: boolean;
  canFulfillRequests: boolean;
  canViewPeople: boolean;
  canManagePeople: boolean;
  canManageRoles: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canRunSetup: boolean;
  canManageApiKeys: boolean;
}

/**
 * Normalizes canonical and legacy role strings into the 3 supported roles:
 * `admin`, `assets_user`, and `requester`.
 */
export function normalizeUserRole(raw?: string | null): UserRole {
  const value = (raw || "").trim().toLowerCase();
  if (value === "admin" || value === "superadmin") return "admin";
  if (value === "assets_user" || value === "manager") return "assets_user";
  return "requester";
}

export const ROLE_METADATA: Record<
  UserRole,
  {
    label: string;
    description: string;
    badgeClass: string;
  }
> = {
  admin: {
    label: "Admin",
    description:
      "Full system control over user roles, settings, setup wizard, reports, and all inventory.",
    badgeClass:
      "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100",
  },
  assets_user: {
    label: "Assets User",
    description:
      "Operates assets, licenses, accessories, checkouts, audits, maintenances, and request fulfillment.",
    badgeClass:
      "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700",
  },
  requester: {
    label: "Request User",
    description:
      "Self-service access to browse requestable items, submit requests, accept EULAs, and view own hardware.",
    badgeClass:
      "bg-muted text-muted-foreground border-border",
  },
};

export const PERMISSION_MATRIX: Record<UserRole, RolePermissions> = {
  admin: {
    canViewAssets: true,
    canCreateEditAssets: true,
    canDeleteAssets: true,
    canCheckoutCheckin: true,
    canAuditAssets: true,
    canManageMaintenances: true,
    canRequestItems: true,
    canFulfillRequests: true,
    canViewPeople: true,
    canManagePeople: true,
    canManageRoles: true,
    canManageSettings: true,
    canViewReports: true,
    canRunSetup: true,
    canManageApiKeys: true,
  },
  assets_user: {
    canViewAssets: true,
    canCreateEditAssets: true,
    canDeleteAssets: false,
    canCheckoutCheckin: true,
    canAuditAssets: true,
    canManageMaintenances: true,
    canRequestItems: true,
    canFulfillRequests: true,
    canViewPeople: true,
    canManagePeople: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewReports: true,
    canRunSetup: false,
    canManageApiKeys: true,
  },
  requester: {
    canViewAssets: true,
    canCreateEditAssets: false,
    canDeleteAssets: false,
    canCheckoutCheckin: false,
    canAuditAssets: false,
    canManageMaintenances: false,
    canRequestItems: true,
    canFulfillRequests: false,
    canViewPeople: false,
    canManagePeople: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewReports: false,
    canRunSetup: false,
    canManageApiKeys: false,
  },
};

export const PERMISSION_LABELS: { key: keyof RolePermissions; label: string }[] = [
  { key: "canViewAssets", label: "View Assets & Requestable Catalog" },
  { key: "canRequestItems", label: "Submit Item Requests & Accept EULAs" },
  { key: "canFulfillRequests", label: "Fulfill & Approve Item Requests" },
  { key: "canCreateEditAssets", label: "Create / Edit Inventory Items" },
  { key: "canCheckoutCheckin", label: "Checkout & Checkin Equipment" },
  { key: "canAuditAssets", label: "Perform Physical Audits" },
  { key: "canManageMaintenances", label: "Manage Asset Maintenances" },
  { key: "canDeleteAssets", label: "Delete Assets & Inventory Records" },
  { key: "canViewPeople", label: "Browse People Directory" },
  { key: "canManagePeople", label: "Create / Edit / Delete People" },
  { key: "canManageRoles", label: "Manage User Accounts & Roles" },
  { key: "canManageSettings", label: "Manage Companies, Locations & Taxonomy" },
  { key: "canViewReports", label: "View Depreciation, Audit & Compliance Reports" },
  { key: "canRunSetup", label: "Run System Setup & Database Wizard" },
  { key: "canManageApiKeys", label: "Generate & Revoke Personal API Keys" },
];

export function getPermissionsForRole(role?: string | null): RolePermissions {
  return PERMISSION_MATRIX[normalizeUserRole(role)];
}

export function canAssignRole(actorRole: UserRole): boolean {
  return normalizeUserRole(actorRole) === "admin";
}
