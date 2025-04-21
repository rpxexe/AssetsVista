import {
  BadgeCheck,
  ChartColumnBig,
  CheckCheck,
  CircleEllipsis,
  Droplets,
  FileArchive,
  FileChartPie,
  HardDriveUpload,
  Keyboard,
  LayoutDashboard,
  LibraryBig,
  List,
  ListRestart,
  Microchip,
  MonitorSmartphone,
  Rocket,
  Settings2,
  ShieldEllipsis,
  ShieldX,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
export const data = {
  dashboard: [
    {
      name: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
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
          url: "#",
          icon: BadgeCheck,
        },
        {
          title: "Deployed",
          url: "#",
          icon: CheckCheck,
        },
        {
          title: "Ready to Deploy",
          url: "#",
          icon: Rocket,
        },
        {
          title: "Pending",
          url: "#",
          icon: CircleEllipsis,
        },
        {
          title: "Un-deployed",
          url: "#",
          icon: X,
        },
        {
          title: "BYOD",
          url: "#",
          icon: MonitorSmartphone,
        },
        {
          title: "Archived",
          url: "#",
          icon: FileArchive,
        },
        {
          title: "Requestable",
          url: "#",
          icon: HardDriveUpload,
        },
        {
          title: "Due for Audit",
          url: "#",
          icon: ShieldX,
        },
        {
          title: "Due for Checkin",
          url: "#",
          icon: ShieldEllipsis,
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
          url: "#",
        },
        {
          title: "Custom Assets Report",
          url: "#",
        },
        {
          title: "Audit Log",
          url: "#",
        },
        {
          title: "Depreciation Report",
          url: "#",
        },
        {
          title: "License Report",
          url: "#",
        },
        {
          title: "Asset Maintenance Reports",
          url: "#",
        },
        {
          title: "Unaccepted Asset",
          url: "#",
        },
        {
          title: "Accessory Report",
          url: "#",
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
      url: "#",
      icon: Keyboard,
    },
    {
      name: "Consumables",
      url: "#",
      icon: Droplets,
    },
    {
      name: "Components",
      url: "#",
      icon: Microchip,
    },
    {
      name: "Predefined Kits",
      url: "#",
      icon: ListRestart,
    },
    {
      name: "People",
      url: "#",
      icon: Users,
    },
    {
      name: "Requestable Items",
      url: "#",
      icon: ShoppingBag,
    },
  ],
};
