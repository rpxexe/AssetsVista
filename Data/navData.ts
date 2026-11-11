import {
  BadgeCheck,
  CalendarDays,
  ChartColumnBig,
  CheckCheck,
  CheckSquare,
  Circle,
  CircleEllipsis,
  ClipboardCheck,
  ClipboardList,
  CloudUpload,
  Crown,
  DoorOpen,
  Droplets,
  FileArchive,
  FileChartPie,
  HardDriveUpload,
  History,
  Keyboard,
  LayoutDashboard,
  LibraryBig,
  List,
  Microchip,
  MonitorSmartphone,
  Rocket,
  ScanLine,
  Settings2,
  ShieldEllipsis,
  ShieldX,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import type { RolePermissions } from "@/lib/rbac";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  iconClassName?: string;
  countKey?: string;
  permissionKey?: keyof RolePermissions;
  separatorBefore?: boolean;
}

export interface NavGroupItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavSubItem[];
}

export const data = {
  dashboard: [
    {
      name: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Calendar",
      url: "/calendar",
      icon: CalendarDays,
    },
  ],
  navAsset: [
    {
      title: "Assets",
      url: "#",
      icon: LibraryBig,
      isActive: false,
      items: [
        {
          title: "List All",
          url: "/assets/listall",
          icon: List,
          countKey: "total",
        },
        {
          title: "CheckedOut",
          url: "/assets/listall?status=CheckedOut",
          icon: BadgeCheck,
        },
        {
          title: "Deployed",
          url: "/assets/listall?status=Deployed",
          icon: CheckCheck,
          countKey: "status:deployed",
        },
        {
          title: "Ready to Deploy",
          url: "/assets/listall?status=Ready%20to%20Deploy",
          icon: Rocket,
          countKey: "status:ready to deploy",
        },
        {
          title: "Pending",
          url: "/assets/listall?status=Pending",
          icon: CircleEllipsis,
          countKey: "status:pending",
        },
        {
          title: "Un-deployed",
          url: "/assets/listall?status=Undeployed",
          icon: X,
          countKey: "status:undeployed",
        },
        {
          title: "BYOD",
          url: "/assets/listall?status=BYOD",
          icon: MonitorSmartphone,
          countKey: "status:byod",
        },
        {
          title: "Archived",
          url: "/assets/listall?status=Archived",
          icon: FileArchive,
          countKey: "status:archived",
        },
        {
          title: "Requestable",
          url: "/assets/listall?status=Requestable",
          icon: HardDriveUpload,
        },
        {
          title: "Due for Audit",
          url: "/assets/listall?filter=due_audit",
          icon: ShieldX,
          countKey: "dueAudit",
        },
        {
          title: "Due for Checkin",
          url: "/assets/listall?filter=due_checkin",
          icon: ShieldEllipsis,
          countKey: "dueCheckin",
        },
        {
          title: "Past EOL",
          url: "/assets/listall?past_eol=1",
          icon: History,
          countKey: "pastEol",
        },
        {
          title: "Quick Scan Checkin",
          url: "/assets/quick-scan-checkin",
          icon: ScanLine,
          permissionKey: "canCheckoutCheckin",
          separatorBefore: true,
        },
        {
          title: "Bulk Checkout",
          url: "/assets/bulk-checkout",
          icon: CheckSquare,
          permissionKey: "canCheckoutCheckin",
        },
        {
          title: "Deleted",
          url: "/assets/deleted",
          icon: Trash2,
          countKey: "deleted",
          permissionKey: "canDeleteAssets",
        },
        {
          title: "Scanner Bulk Audit",
          url: "/assets/scanner-bulk-audit",
          icon: ClipboardCheck,
          permissionKey: "canAuditAssets",
        },
        {
          title: "Maintenances",
          url: "/maintenances",
          icon: Wrench,
          separatorBefore: true,
        },
        {
          title: "Acceptances",
          url: "/acceptances",
          icon: ClipboardCheck,
        },
        {
          title: "Requests",
          url: "/requests",
          icon: ClipboardList,
        },
      ],
    },
  ] as NavGroupItem[],

  navSetting: [
    {
      title: "Directory",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Status Labels",
          url: "/settings/status",
        },
        {
          title: "Asset Models",
          url: "/settings/assetmodel",
        },
        {
          title: "Categories",
          url: "/settings/category",
        },
        {
          title: "Manufacturers",
          url: "/settings/manufacturer",
        },
        {
          title: "Suppliers",
          url: "/settings/supplier",
        },
        {
          title: "Departments",
          url: "/settings/department",
        },
        {
          title: "Locations",
          url: "/settings/location",
        },
        {
          title: "Companies",
          url: "/settings/company",
        },
      ],
    },
  ],
  navReport: [
    {
      title: "Reports",
      url: "#",
      icon: ChartColumnBig,
      items: [
        {
          title: "Activity Reports",
          url: "/reports/activity",
        },
        {
          title: "Custom Assets Report",
          url: "/reports/custom",
        },
        {
          title: "Audit Log",
          url: "/reports/activity",
        },
        {
          title: "Depreciation Report",
          url: "/reports/depreciation",
        },
        {
          title: "License Report",
          url: "/reports/licenses",
        },
        {
          title: "Asset Maintenance Reports",
          url: "/reports/maintenance",
        },
        {
          title: "Unaccepted Asset",
          url: "/acceptances",
        },
        {
          title: "Accessory Report",
          url: "/accessories",
        },
      ],
    },
  ],
  navPeople: [
    {
      title: "People",
      url: "#",
      icon: Users,
      isActive: false,
      items: [
        {
          title: "List All",
          url: "/people",
          icon: Circle,
          countKey: "people:total",
        },
        {
          title: "Superusers",
          url: "/people?filter=superusers",
          icon: Crown,
          iconClassName: "text-rose-500",
          countKey: "people:superusers",
        },
        {
          title: "Admin Users",
          url: "/people?filter=admins",
          icon: Crown,
          iconClassName: "text-amber-500",
          countKey: "people:admins",
        },
        {
          title: "Deleted Users",
          url: "/people/deleted",
          icon: UserX,
          iconClassName: "text-red-500",
          countKey: "people:deleted",
          permissionKey: "canManagePeople",
        },
        {
          title: "Login Enabled",
          url: "/people?filter=login_enabled",
          icon: UserCheck,
          iconClassName: "text-emerald-500",
          countKey: "people:loginEnabled",
        },
        {
          title: "Login Disabled",
          url: "/people?filter=login_disabled",
          icon: UserMinus,
          iconClassName: "text-rose-500",
          countKey: "people:loginDisabled",
        },
        {
          title: "Offboarding Soon",
          url: "/people/offboarding",
          icon: DoorOpen,
          iconClassName: "text-amber-500",
          countKey: "people:offboardingSoon",
        },
      ],
    },
  ] as NavGroupItem[],
  projects: [
    {
      name: "Licenses",
      url: "/licenses",
      icon: FileChartPie,
    },
    {
      name: "Accessories",
      url: "/accessories",
      icon: Keyboard,
    },
    {
      name: "Consumables",
      url: "/consumables",
      icon: Droplets,
    },
    {
      name: "Components",
      url: "/components",
      icon: Microchip,
    },
  ],
  importNav: [
    {
      name: "Import",
      url: "/import",
      icon: CloudUpload,
    },
  ],
};
