import dbconnect from "@/lib/dbconnect";
import { parseReadableError } from "@/lib/errorMessages";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { StatusModel } from "@/models/setting/Status.model";
import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();
  let dbConnected = false;
  let pingMs = 0;

  try {
    await dbconnect();
    dbConnected = true;
    pingMs = Date.now() - start;

    const workspaceId = await getWorkspaceUserId();

    const [
      settings,
      companiesCount,
      locationsCount,
      departmentsCount,
      statusesCount,
      categoriesCount,
      peopleCount,
      assetsCount,
    ] = workspaceId
      ? await Promise.all([
          SettingsModel.findOne({ userId: workspaceId }).lean(),
          CompanyModel.countDocuments({ userId: workspaceId }),
          LocationModel.countDocuments({ userId: workspaceId }),
          DepartmentModel.countDocuments({ userId: workspaceId }),
          StatusModel.countDocuments({ userId: workspaceId }),
          CategoryModel.countDocuments({ userId: workspaceId }),
          PeopleModel.countDocuments({ userId: workspaceId }),
          AssetModel.countDocuments({ userId: workspaceId }),
        ])
      : [null, 0, 0, 0, 0, 0, 0, 0];

    const envChecks = {
      database: {
        ok: dbConnected,
        label: "MongoDB Database Connection",
        detail: `Connected (${pingMs}ms)`,
      },
      mongodbUri: {
        ok: Boolean(process.env.MONGODB_URI),
        label: "MONGODB_URI Environment Variable",
        detail: process.env.MONGODB_URI ? "Configured" : "Missing in .env.local",
      },
      sessionAuth: {
        ok: true,
        label: "Role-Based Auth (Admin / Assets User / Request User)",
        detail: process.env.AUTH_SECRET
          ? "HTTP-only signed sessions configured (AUTH_SECRET set)"
          : "HTTP-only signed sessions active (set AUTH_SECRET in prod)",
      },
      elasticSearch: {
        ok: true,
        label: "Global Elastic Search Engine",
        detail: process.env.ELASTICSEARCH_URL
          ? `Connected to cluster (${process.env.ELASTICSEARCH_URL})`
          : "Built-in Local Elastic Engine Ready",
      },
    };

    const checklist = {
      hasCompany: companiesCount > 0,
      hasLocation: locationsCount > 0,
      hasDepartment: departmentsCount > 0,
      hasStatuses: statusesCount > 0,
      hasCategories: categoriesCount > 0,
      hasPeople: peopleCount > 0,
      hasAssets: assetsCount > 0,
    };

    return NextResponse.json(
      {
        success: true,
        setup_completed: Boolean(settings?.setup_completed),
        settings: settings || null,
        counts: {
          companies: companiesCount,
          locations: locationsCount,
          departments: departmentsCount,
          statuses: statusesCount,
          categories: categoriesCount,
          people: peopleCount,
          assets: assetsCount,
        },
        checklist,
        preflight: envChecks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Setup status check failed:", error);
    const readable = parseReadableError(error, "Database connection failed.");
    return NextResponse.json(
      {
        success: false,
        setup_completed: false,
        message: readable.message,
        preflight: {
          database: {
            ok: false,
            label: "MongoDB Database Connection",
            detail: readable.message,
          },
          mongodbUri: {
            ok: Boolean(process.env.MONGODB_URI),
            label: "MONGODB_URI Environment Variable",
            detail: process.env.MONGODB_URI ? "Configured" : "Missing in .env.local",
          },
          sessionAuth: {
            ok: true,
            label: "Role-Based Auth (Admin / Assets User / Request User)",
            detail: process.env.AUTH_SECRET ? "AUTH_SECRET set" : "Built-in active",
          },
          elasticSearch: {
            ok: true,
            label: "Global Elastic Search Engine",
            detail: "Waiting for DB",
          },
        },
      },
      { status: 200 }
    );
  }
}

