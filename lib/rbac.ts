export type UserRole = "superadmin" | "admin" | "manager" | "user";

export const USER_ROLES: UserRole[] = ["superadmin", "admin", "manager", "user"];

export interface RolePermissions {
  canViewAssets: boolean;
  canCreateEditAssets: boolean;
  canDeleteAssets: boolean;
  canCheckoutCheckin: boolean;
  canAuditAssets: boolean;
  canViewPeople: boolean;
  canManagePeople: boolean;
  canManageRoles: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canRunSetup: boolean;
}

export const ROLE_METADATA: Record<
  UserRole,
  {
    label: string;
    description: string;
    badgeClass: string;
  }
> = {
  superadmin: {
    label: "Super Admin",
    description: "Unrestricted control over roles, system settings, setup wizard, and all inventory.",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300",
  },
  admin: {
    label: "Admin",
    description: "Full access to assets, licenses, people, directory settings, and reports.",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300",
  },
  manager: {
    label: "Manager",
    description: "Can checkout/checkin assets, run physical audits, and view operational reports.",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300",
  },
  user: {
    label: "Standard User",
    description: "Self-service access to dashboard, assigned hardware, and printable sign-off sheets.",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
};

export const PERMISSION_MATRIX: Record<UserRole, RolePermissions> = {
  superadmin: {
    canViewAssets: true,
    canCreateEditAssets: true,
    canDeleteAssets: true,
    canCheckoutCheckin: true,
    canAuditAssets: true,
    canViewPeople: true,
    canManagePeople: true,
    canManageRoles: true,
    canManageSettings: true,
    canViewReports: true,
    canRunSetup: true,
  },
  admin: {
    canViewAssets: true,
    canCreateEditAssets: true,
    canDeleteAssets: true,
    canCheckoutCheckin: true,
    canAuditAssets: true,
    canViewPeople: true,
    canManagePeople: true,
    canManageRoles: true,
    canManageSettings: true,
    canViewReports: true,
    canRunSetup: false,
  },
  manager: {
    canViewAssets: true,
    canCreateEditAssets: true,
    canDeleteAssets: false,
    canCheckoutCheckin: true,
    canAuditAssets: true,
    canViewPeople: true,
    canManagePeople: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewReports: true,
    canRunSetup: false,
  },
  user: {
    canViewAssets: true,
    canCreateEditAssets: false,
    canDeleteAssets: false,
    canCheckoutCheckin: false,
    canAuditAssets: false,
    canViewPeople: false,
    canManagePeople: false,
    canManageRoles: false,
    canManageSettings: false,
    canViewReports: false,
    canRunSetup: false,
  },
};

export const PERMISSION_LABELS: { key: keyof RolePermissions; label: string }[] = [
  { key: "canViewAssets", label: "View Assets & Inventory" },
  { key: "canCreateEditAssets", label: "Create / Edit Inventory Items" },
  { key: "canDeleteAssets", label: "Delete Assets & Records" },
  { key: "canCheckoutCheckin", label: "Checkout & Checkin Equipment" },
  { key: "canAuditAssets", label: "Perform Physical Audits" },
  { key: "canViewPeople", label: "Browse People Directory" },
  { key: "canManagePeople", label: "Create / Edit / Delete People" },
  { key: "canManageRoles", label: "Manage User Roles & Login Access" },
  { key: "canManageSettings", label: "Manage Companies, Locations & Taxonomy" },
  { key: "canViewReports", label: "View Depreciation, Audit & Compliance Reports" },
  { key: "canRunSetup", label: "Run System Setup Wizard" },
];

export function getPermissionsForRole(role?: string | null): RolePermissions {
  if (role && role in PERMISSION_MATRIX) {
    return PERMISSION_MATRIX[role as UserRole];
  }
  return PERMISSION_MATRIX.user;
}

export function canAssignRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === "superadmin") return true;
  if (actorRole === "admin") return targetRole !== "superadmin";
  return false;
}

