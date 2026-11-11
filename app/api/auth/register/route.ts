import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { hashPassword } from "@/lib/password";
import { normalizeUserRole } from "@/lib/rbac";
import { shouldRedirectToSetup } from "@/lib/serverAuth";
import { applySessionCookie, signSessionToken } from "@/lib/session";
import { ensureCleanUserIndexes, isLegacyUserIndexError } from "@/lib/userIndexes";
import { LoginAttemptModel } from "@/models/LoginAttempt.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import UserModel from "@/models/Users.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    const cleanEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const workspaceName =
      typeof body.workspaceName === "string" ? body.workspaceName.trim().slice(0, 80) : "";

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await dbconnect();
    await ensureCleanUserIndexes();

    const existing: any = await UserModel.findOne({ email: cleanEmail }).select("+passwordHash");

    if (existing && existing.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    const emailPrefix = cleanEmail.split("@")[0] || "user";
    const fullName = rawName || existing?.name || emailPrefix;
    const passwordHash = hashPassword(password);

    if (existing) {
      if (existing.isActive === false) {
        return NextResponse.json(
          {
            success: false,
            message: "This account is suspended. Contact your workspace Admin.",
          },
          { status: 403 }
        );
      }

      const userId = existing._id.toString();
      const workspaceId = existing.workspaceId || userId;
      const role = normalizeUserRole(existing.role);

      existing.passwordHash = passwordHash;
      existing.name = fullName;
      existing.role = role;
      existing.workspaceId = workspaceId;
      existing.emailVerified = true;
      existing.lastLogin = new Date();
      await existing.save();

      const person = existing.personId
        ? await PeopleModel.findById(existing.personId).select("_id name email").lean()
        : null;

      const token = await signSessionToken({ userId, workspaceId, role });
      const needsSetup = role === "admin" ? await shouldRedirectToSetup(userId) : false;

      const res = NextResponse.json(
        {
          success: true,
          message: "Account activated successfully",
          data: {
            user: {
              _id: userId,
              email: existing.email,
              name: existing.name,
              role,
              workspaceId,
            },
            person,
            redirectTo: needsSetup ? "/setup" : "/admin",
          },
        },
        { status: 200 }
      );
      applySessionCookie(res, token);
      return res;
    }

    // Brand-new signup creates an isolated Admin workspace with clean empty inventory
    const [firstName, ...restName] = fullName.split(/\s+/);
    const lastName = restName.join(" ");

    const createAccount = () =>
      UserModel.create({
        email: cleanEmail,
        passwordHash,
        name: fullName,
        first_name: firstName || emailPrefix,
        last_name: lastName || undefined,
        username: emailPrefix,
        role: "admin",
        isActive: true,
        emailVerified: true,
        lastLogin: new Date(),
      });

    let createdUser;
    try {
      createdUser = await createAccount();
    } catch (err) {
      if (isLegacyUserIndexError(err)) {
        await ensureCleanUserIndexes(true);
        createdUser = await createAccount();
      } else {
        throw err;
      }
    }

    const userId = createdUser._id.toString();
    createdUser.workspaceId = userId;
    await createdUser.save();

    if (workspaceName) {
      await SettingsModel.findOneAndUpdate(
        { userId },
        {
          $set: { site_name: workspaceName },
          $setOnInsert: { userId, setup_completed: false },
        },
        { upsert: true }
      ).catch(() => null);
    }

    const token = await signSessionToken({
      userId,
      workspaceId: userId,
      role: "admin",
    });

    await LoginAttemptModel.create({
      workspaceId: userId,
      userId,
      email: cleanEmail,
      role: "admin",
      action: "register",
      success: true,
      reason: "Registered new Admin workspace",
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "local",
      userAgent: req.headers.get("user-agent")?.slice(0, 180) || "",
    }).catch(() => null);

    const response = NextResponse.json(
      {
        success: true,
        message: "Workspace account created successfully",
        data: {
          user: {
            _id: userId,
            email: createdUser.email,
            name: createdUser.name,
            role: "admin",
            workspaceId: userId,
          },
          person: null,
          redirectTo: "/setup",
        },
      },
      { status: 201 }
    );

    applySessionCookie(response, token);
    return response;
  } catch (error) {
    return apiErrorResponse(error, "Unable to create account right now.", "Auth register error:");
  }
}

