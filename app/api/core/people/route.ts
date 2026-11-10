import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel } from "@/models/Assets.model";
import { LicenseModel } from "@/models/Licenses.model";
import UserModel from "@/models/Users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const filter: Record<string, any> = { userId: workspaceId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { employee_num: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch people, asset assigned counts, active licenses, and auth user roles in parallel (Zero N+1 queries)
    const [people, assetCounts, licenses, authUsers] = await Promise.all([
      PeopleModel.find(filter)
        .sort({ createdAt: -1 })
        .populate([
          { path: "department", select: "name" },
          { path: "location", select: "name" },
          { path: "company", select: "name" },
        ])
        .lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, assigned_to: { $ne: null } } },
        { $group: { _id: "$assigned_to", count: { $sum: 1 } } },
      ]),
      LicenseModel.find({
        userId: workspaceId,
        $or: [
          { license_to_name: { $exists: true, $ne: "" } },
          { license_to_email: { $exists: true, $ne: "" } },
        ],
      })
        .select("_id license_to_name license_to_email")
        .lean(),
      UserModel.find({
        $or: [
          { workspaceId },
          { clerkId: workspaceId, workspaceId: { $exists: false } },
        ],
      })
        .select("_id email role isActive lastLogin personId")
        .lean(),
    ]);

    // Build O(1) lookup maps
    const assetCountMap = new Map<string, number>();
    for (const ac of assetCounts) {
      if (ac._id) {
        assetCountMap.set(ac._id.toString(), ac.count);
      }
    }

    const userByPersonId = new Map<string, any>();
    const userByEmail = new Map<string, any>();
    for (const u of authUsers as any[]) {
      if (u.personId) userByPersonId.set(u.personId.toString(), u);
      if (u.email) userByEmail.set(u.email.trim().toLowerCase(), u);
    }

    // Build O(1) license lookups indexed by name and email
    const licensesByName = new Map<string, Set<string>>();
    const licensesByEmail = new Map<string, Set<string>>();

    for (const lic of licenses) {
      const licId = lic._id.toString();
      if (lic.license_to_name) {
        const key = lic.license_to_name.trim().toLowerCase();
        if (!licensesByName.has(key)) licensesByName.set(key, new Set());
        licensesByName.get(key)!.add(licId);
      }
      if (lic.license_to_email) {
        const key = lic.license_to_email.trim().toLowerCase();
        if (!licensesByEmail.has(key)) licensesByEmail.set(key, new Set());
        licensesByEmail.get(key)!.add(licId);
      }
    }

    // Map counts and RBAC roles in memory in O(1) time
    const peopleWithCounts = people.map((p: any) => {
      const pId = p._id.toString();
      const assetsCount = assetCountMap.get(pId) || 0;

      const matchedLicenseIds = new Set<string>();
      if (p.name) {
        const byName = licensesByName.get(p.name.trim().toLowerCase());
        if (byName) for (const id of byName) matchedLicenseIds.add(id);
      }
      if (p.email) {
        const byEmail = licensesByEmail.get(p.email.trim().toLowerCase());
        if (byEmail) for (const id of byEmail) matchedLicenseIds.add(id);
      }

      const linkedUser =
        userByPersonId.get(pId) ||
        (p.email ? userByEmail.get(p.email.trim().toLowerCase()) : undefined);

      return {
        ...p,
        assets_count: assetsCount,
        licenses_count: matchedLicenseIds.size,
        user_id: linkedUser?._id?.toString() || null,
        role: linkedUser?.role || null,
        isActive: linkedUser ? linkedUser.isActive !== false : null,
        lastLogin: linkedUser?.lastLogin || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "People fetched successfully",
        data: peopleWithCounts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching people" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const firstName = body.first_name?.trim() || "";
    const lastName = body.last_name?.trim() || "";
    const name = body.name?.trim() || [firstName, lastName].filter(Boolean).join(" ") || "New User";

    const baseUser = body.username?.trim()
      ? body.username.trim()
      : body.email
      ? body.email.split("@")[0].toLowerCase()
      : [firstName, lastName].filter(Boolean).join(".").toLowerCase() || `user_${Date.now()}`;

    // Ensure unique username within workspace
    let username = baseUser;
    const existing = await PeopleModel.findOne({ userId: workspaceId, username });
    if (existing) {
      username = `${baseUser}.${Math.floor(100 + Math.random() * 900)}`;
    }

    const person = new PeopleModel({
      userId: workspaceId,
      name,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      title: body.title || body.job_title,
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      username,
      department:
        body.department && mongoose.Types.ObjectId.isValid(body.department)
          ? body.department
          : undefined,
      location:
        body.location && mongoose.Types.ObjectId.isValid(body.location)
          ? body.location
          : undefined,
      company:
        body.company && mongoose.Types.ObjectId.isValid(body.company)
          ? body.company
          : undefined,
      employee_num: body.employee_num?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      image: body.image?.trim() || undefined,
    });

    await person.save();
    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Person created successfully",
        data: person,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error creating person profile.", "Error creating person:");
  }
}

export async function DELETE(req: NextRequest) {
  await dbconnect();
  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Person ID" },
      { status: 400 }
    );
  }

  try {
    // Snipe-IT safety: Prevent deleting a person who currently has assigned assets
    const assignedCount = await AssetModel.countDocuments({
      userId: workspaceId,
      assigned_to: id,
    });
    if (assignedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete person who currently has ${assignedCount} assigned asset(s). Please check in or reassign their assets first.`,
        },
        { status: 400 }
      );
    }

    const deleted = await PeopleModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Person not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { success: true, message: "Person deleted successfully", data: deleted },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error deleting person profile.", "Error deleting person:");
  }
}
