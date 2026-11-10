import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { seedWorkspaceDemoData } from "@/lib/demoData";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import {
  ensureCleanUserIndexes,
  ensureMultiTenantIndexes,
  isLegacyUserIndexError,
} from "@/lib/userIndexes";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import UserModel from "@/models/Users.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import { NextResponse } from "next/server";

const DEFAULT_STATUS_LABELS = [
  { name: "Ready to Deploy", type: "deployable", notes: "Available and ready to check out" },
  { name: "Deployed", type: "deployable", notes: "Currently deployed in active use" },
  { name: "CheckedOut", type: "deployable", notes: "Checked out to a user or location" },
  { name: "Pending", type: "pending", notes: "In repair, awaiting parts, or onboarding" },
  { name: "Undeployed", type: "undeployable", notes: "Broken or not currently deployable" },
  { name: "Archived", type: "archived", notes: "Decommissioned or retired equipment" },
  { name: "Requestable", type: "deployable", notes: "Eligible for employee self-service request" },
];

const DEFAULT_CATEGORIES = [
  { name: "Laptops", type: "Asset", email: true },
  { name: "Desktops", type: "Asset", email: true },
  { name: "Monitors", type: "Asset", email: false },
  { name: "Mobile Devices", type: "Asset", email: true },
  { name: "Software Licenses", type: "License", email: true },
  { name: "Keyboards & Mice", type: "Accessory", email: false },
  { name: "Memory & Storage", type: "Component", email: false },
  { name: "Office Consumables", type: "Consumable", email: false },
];

export async function POST(req: Request) {
  await dbconnect();

  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in before running workspace setup.",
        },
        { status: 401 }
      );
    }

    await ensureMultiTenantIndexes();

    const body = await req.json();

    const {
      // Step 2: Organization & Inventory Defaults
      companyName = "My Organization",
      companyEmail = "it@organization.com",
      locationName = "Headquarters",
      locationCity = "",
      locationState = "",
      locationAddress = "Main Campus",
      departmentName = "IT & Operations",
      departmentPhone = "+1-000-000-0000",
      seedDefaultStatuses = true,
      seedDefaultCategories = true,
      seedSampleCatalog = false,
      seedDemoData = false,

      // Step 3: Site & System Preferences
      siteName = "AssetsVista",
      defaultCurrency = "$",
      currencyCode = "USD",
      locale = "en-US",
      autoIncrementPrefix = "AST-",
      autoIncrementAssets = true,
      auditIntervalMonths = 12,
      defaultEulaText = "",
      alertEmail = "",

      // Step 4: Admin Account Setup
      adminName = "System Administrator",
      adminFirstName = "",
      adminLastName = "",
      adminEmail = "",
      adminUsername = "",
      adminTitle = "IT Administrator",
      employeeNum = "EMP-001",
      clerkId = "",
    } = body;

    if (!companyName?.trim() || !locationName?.trim() || !departmentName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Company Name, Primary Location Name, and Primary Department Name are required.",
        },
        { status: 400 }
      );
    }

    if (!siteName?.trim() || siteName.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Site / Portal Name must be at least 2 characters.",
        },
        { status: 400 }
      );
    }

    // 1. Upsert Primary Company and Location in parallel (scoped to workspace)
    const [company, location] = await Promise.all([
      CompanyModel.findOneAndUpdate(
        { userId: workspaceId, name: companyName.trim() },
        {
          $setOnInsert: {
            userId: workspaceId,
            name: companyName.trim(),
            email: companyEmail.trim() || "it@organization.com",
          },
        },
        { upsert: true, new: true }
      ).lean<{ _id: unknown; name: string; email: string } | null>(),
      LocationModel.findOneAndUpdate(
        { userId: workspaceId, name: locationName.trim() },
        {
          $setOnInsert: {
            userId: workspaceId,
            name: locationName.trim(),
            currency: currencyCode,
            address: locationAddress.trim() || "Main Campus",
            city: locationCity.trim(),
            state: locationState.trim(),
          },
        },
        { upsert: true, new: true }
      ).lean<{ _id: unknown; name: string } | null>(),
    ]);

    if (!company || !location) {
      throw new Error("Failed to provision primary company or location");
    }

    // 2. Upsert Primary Department (depends on Company & Location)
    const department = await DepartmentModel.findOneAndUpdate(
      { userId: workspaceId, name: departmentName.trim() },
      {
        $setOnInsert: {
          userId: workspaceId,
          name: departmentName.trim(),
          company: company._id,
          location: location._id,
          phone: departmentPhone.trim() || "+1-000-000-0000",
        },
      },
      { upsert: true, new: true }
    ).lean<{ _id: unknown; name: string } | null>();

    if (!department) {
      throw new Error("Failed to provision primary department");
    }

    // 4. Parallel Seeding Tasks
    const seedPromises: Promise<unknown>[] = [];

    if (seedDefaultStatuses) {
      for (const st of DEFAULT_STATUS_LABELS) {
        seedPromises.push(
          StatusModel.updateOne(
            { userId: workspaceId, name: st.name },
            { $setOnInsert: { ...st, userId: workspaceId } },
            { upsert: true }
          )
        );
      }
    }

    if (seedDefaultCategories) {
      for (const cat of DEFAULT_CATEGORIES) {
        seedPromises.push(
          CategoryModel.updateOne(
            { userId: workspaceId, name: cat.name },
            { $setOnInsert: { ...cat, userId: workspaceId } },
            { upsert: true }
          )
        );
      }
    }

    if (seedSampleCatalog) {
      seedPromises.push(
        ManufacturerModel.updateOne(
          { userId: workspaceId, name: "Apple" },
          {
            $setOnInsert: {
              userId: workspaceId,
              name: "Apple",
              url: "https://www.apple.com",
              support_url: "https://support.apple.com",
              support_phone: "1-800-275-2273",
              support_email: "support@apple.com",
            },
          },
          { upsert: true }
        ),
        ManufacturerModel.updateOne(
          { userId: workspaceId, name: "Dell" },
          {
            $setOnInsert: {
              userId: workspaceId,
              name: "Dell",
              url: "https://www.dell.com",
              support_url: "https://www.dell.com/support",
              support_phone: "1-800-624-9896",
              support_email: "support@dell.com",
            },
          },
          { upsert: true }
        ),
        SupplierModel.updateOne(
          { userId: workspaceId, name: "CDW Direct" },
          {
            $setOnInsert: {
              userId: workspaceId,
              name: "CDW Direct",
              address: "200 N Milwaukee Ave, Vernon Hills, IL",
              contact_name: "Enterprise Account Rep",
              email: "orders@cdw.example.com",
              phone: "1-800-800-4239",
            },
          },
          { upsert: true }
        )
      );
    }

    await Promise.all(seedPromises);

    // If sample catalog is requested, link a sample AssetModel after Laptops category exists
    if (seedSampleCatalog) {
      const laptopCat = await CategoryModel.findOne({
        userId: workspaceId,
        name: "Laptops",
      })
        .select("_id")
        .lean();
      if (laptopCat) {
        await AssetModel_Model.updateOne(
          { userId: workspaceId, name: "MacBook Pro 14 M3" },
          {
            $setOnInsert: {
              userId: workspaceId,
              name: "MacBook Pro 14 M3",
              model_no: "MR7J3LL/A",
              category: laptopCat._id,
              eol_rate: 36,
            },
          },
          { upsert: true }
        );
      }
    }

    // 5. Upsert Admin User & People Directory Record
    const cleanEmail = adminEmail.trim().toLowerCase() || companyEmail.trim().toLowerCase();
    const resolvedFullName =
      adminName.trim() ||
      [adminFirstName, adminLastName].filter(Boolean).join(" ").trim() ||
      "System Administrator";
    const resolvedUsername =
      adminUsername.trim() ||
      (cleanEmail ? cleanEmail.split("@")[0].toLowerCase() : "admin");

    if (cleanEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid administrator email address ("${cleanEmail}"). Please enter a valid email.`,
          },
          { status: 400 }
        );
      }

      // Drop stale legacy indexes like non-sparse auth0Id_1 automatically before modifying users
      await ensureCleanUserIndexes();

      // 5a. Ensure People directory profile exists without username collision
      let personDoc = await PeopleModel.findOne({
        userId: workspaceId,
        email: cleanEmail,
      });
      if (!personDoc) {
        const usernameTaken = await PeopleModel.findOne({
          userId: workspaceId,
          username: resolvedUsername,
        })
          .select("_id")
          .lean();
        const safeUsername = usernameTaken
          ? `${resolvedUsername}.${Math.floor(100 + Math.random() * 900)}`
          : resolvedUsername;

        personDoc = await PeopleModel.create({
          userId: workspaceId,
          name: resolvedFullName,
          first_name: adminFirstName.trim() || resolvedFullName.split(" ")[0] || "Admin",
          last_name: adminLastName.trim() || resolvedFullName.split(" ").slice(1).join(" ") || "",
          username: safeUsername,
          email: cleanEmail,
          title: adminTitle.trim() || "IT Administrator",
          employee_num: employeeNum.trim() || "EMP-001",
          company: company._id,
          location: location._id,
          department: department._id,
        });
      }

      // 5b. Upsert Admin User cleanly by Clerk ID or email (and auto-recover if legacy index blocks upsert)
      const userFilter = clerkId
        ? { $or: [{ clerkId }, { email: cleanEmail }] }
        : { email: cleanEmail };

      const syncAdminUser = async () => {
        const existingUser = await UserModel.findOne(userFilter);
        if (existingUser) {
          existingUser.name = resolvedFullName;
          existingUser.role = "superadmin";
          existingUser.isActive = true;
          existingUser.emailVerified = true;
          existingUser.lastLogin = new Date();
          existingUser.personId = personDoc._id as any;
          existingUser.workspaceId = existingUser.workspaceId || workspaceId;
          if (clerkId && !existingUser.clerkId) {
            existingUser.clerkId = clerkId;
          }
          await existingUser.save();
          return;
        }

        await UserModel.create({
          email: cleanEmail,
          name: resolvedFullName,
          first_name: adminFirstName.trim() || undefined,
          last_name: adminLastName.trim() || undefined,
          username: personDoc.username,
          role: "superadmin",
          workspaceId,
          isActive: true,
          emailVerified: true,
          personId: personDoc._id,
          lastLogin: new Date(),
          ...(clerkId ? { clerkId } : {}),
        });
      };

      try {
        await syncAdminUser();
      } catch (userErr) {
        if (isLegacyUserIndexError(userErr)) {
          await ensureCleanUserIndexes(true);
          await syncAdminUser();
        } else {
          throw userErr;
        }
      }
    }

    // Optional: populate demo inventory across all collections if requested
    if (seedDemoData) {
      await seedWorkspaceDemoData(workspaceId);
    }

    // 6. Save Workspace System Settings (Mark setup as completed)
    const settingsPayload: Record<string, unknown> = {
      userId: workspaceId,
      site_name: siteName.trim() || "AssetsVista",
      default_currency: defaultCurrency.trim() || "$",
      currency_code: currencyCode.trim() || "USD",
      locale: locale.trim() || "en-US",
      auto_increment_prefix: autoIncrementPrefix.trim() || "AST-",
      auto_increment_assets: Boolean(autoIncrementAssets),
      audit_interval_months: Number(auditIntervalMonths) || 12,
      alert_email: alertEmail.trim() || cleanEmail || undefined,
      setup_completed: true,
      setup_completed_at: new Date(),
      setup_completed_by: resolvedFullName,
    };

    if (defaultEulaText && defaultEulaText.trim()) {
      settingsPayload.default_eula_text = defaultEulaText.trim();
    }

    const savedSettings = await SettingsModel.findOneAndUpdate(
      { userId: workspaceId },
      { $set: settingsPayload },
      { upsert: true, new: true, lean: true }
    );

    // Refresh search index so newly provisioned entities appear immediately in global search
    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "AssetsVista setup completed successfully",
        data: {
          settings: savedSettings,
          company,
          location,
          department,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      "Setup wizard could not save your workspace configuration. Please review your inputs and try again.",
      "Setup wizard failed:"
    );
  }
}
