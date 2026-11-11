import {
  BadgeCheck,
  CalendarDays,
  ChartColumnBig,
  CheckCheck,
  CircleEllipsis,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  FileArchive,
  FileChartPie,
  HardDriveUpload,
  Keyboard,
  LayoutDashboard,
  LibraryBig,
  List,
  Microchip,
  MonitorSmartphone,
  Rocket,
  Settings2,
  ShieldEllipsis,
  ShieldX,
  Users,
  Wrench,
  X,
} from "lucide-react";

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
        },
        {
          title: "Ready to Deploy",
          url: "/assets/listall?status=Ready%20to%20Deploy",
          icon: Rocket,
        },
        {
          title: "Pending",
          url: "/assets/listall?status=Pending",
          icon: CircleEllipsis,
        },
        {
          title: "Un-deployed",
          url: "/assets/listall?status=Undeployed",
          icon: X,
        },
        {
          title: "BYOD",
          url: "/assets/listall?status=BYOD",
          icon: MonitorSmartphone,
        },
        {
          title: "Archived",
          url: "/assets/listall?status=Archived",
          icon: FileArchive,
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
        },
        {
          title: "Due for Checkin",
          url: "/assets/listall?filter=due_checkin",
          icon: ShieldEllipsis,
        },
        {
          title: "Maintenances",
          url: "/maintenances",
          icon: Wrench,
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
  ],

  navSetting: [
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Admin Settings Hub",
          url: "/settings",
        },
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
    {
      name: "People",
      url: "/people",
      icon: Users,
    },
  ],
};
