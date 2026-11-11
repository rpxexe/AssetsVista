import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { verifyPassword } from "@/lib/password";
import { normalizeUserRole } from "@/lib/rbac";
import { shouldRedirectToSetup } from "@/lib/serverAuth";
import { applySessionCookie, signSessionToken } from "@/lib/session";
import { LoginAttemptModel } from "@/models/LoginAttempt.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import UserModel from "@/models/Users.model";
import { NextRequest, NextResponse } from "next/server";

function sanitizeRedirectTarget(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/login") &&
    !raw.startsWith("/sign-in") &&
    !raw.startsWith("/sign-up")
  ) {
    return raw;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const requestedRedirect = sanitizeRedirectTarget(body.redirectTo);

    if (!cleanEmail || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "local";
    const userAgent = req.headers.get("user-agent")?.slice(0, 180) || "";

    await dbconnect();
    const userDoc: any = await UserModel.findOne({ email: cleanEmail })
      .select("+passwordHash -__v")
      .lean();

    if (!userDoc || !userDoc.passwordHash) {
      await LoginAttemptModel.create({
        workspaceId: userDoc?.workspaceId || (userDoc?._id ? String(userDoc._id) : undefined),
        email: cleanEmail,
        action: "login",
        success: false,
        reason: userDoc ? "Password not configured" : "Account not found",
        ipAddress,
        userAgent,
      }).catch(() => null);

      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const userId = userDoc._id.toString();
    const workspaceId = userDoc.workspaceId || userDoc.clerkId || userId;
    const role = normalizeUserRole(userDoc.role);

    const valid = verifyPassword(password, userDoc.passwordHash);
    if (!valid) {
      await LoginAttemptModel.create({
        workspaceId,
        userId,
        email: cleanEmail,
        role,
        action: "login",
        success: false,
        reason: "Incorrect password",
        ipAddress,
        userAgent,
      }).catch(() => null);

      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (userDoc.isActive === false) {
      await LoginAttemptModel.create({
        workspaceId,
        userId,
        email: cleanEmail,
        role,
        action: "login",
        success: false,
        reason: "Account suspended",
        ipAddress,
        userAgent,
      }).catch(() => null);

      return NextResponse.json(
        {
          success: false,
          message: "Your account is currently suspended. Contact an Admin to restore access.",
        },
        { status: 403 }
      );
    }

    const [settings] = await Promise.all([
      SettingsModel.findOne({ userId: workspaceId })
        .select("session_max_age_days")
        .lean<{ session_max_age_days?: number } | null>(),
      UserModel.updateOne(
        { _id: userDoc._id },
        { $set: { lastLogin: new Date(), workspaceId, role } }
      ).catch(() => null),
      LoginAttemptModel.create({
        workspaceId,
        userId,
        email: cleanEmail,
        role,
        action: "login",
        success: true,
        reason: "Authenticated via email & password",
        ipAddress,
        userAgent,
      }).catch(() => null),
    ]);

    const person = userDoc.personId
      ? await PeopleModel.findById(userDoc.personId).select("_id name email").lean()
      : await PeopleModel.findOne({ userId: workspaceId, email: cleanEmail })
          .select("_id name email")
          .lean();

    const maxAgeDays = Math.min(90, Math.max(1, Number(settings?.session_max_age_days) || 7));
    const maxAgeSeconds = maxAgeDays * 86400;
    const token = await signSessionToken({ userId, workspaceId, role, maxAgeSeconds });
    const needsSetup =
      role === "admin" && !requestedRedirect ? await shouldRedirectToSetup(userId) : false;

    const { passwordHash: _omitted, ...safeUser } = userDoc;
    void _omitted;

    const response = NextResponse.json(
      {
        success: true,
        message: "Signed in successfully",
        data: {
          user: { ...safeUser, _id: userId, workspaceId, role },
          person: person || null,
          redirectTo: needsSetup ? "/setup" : requestedRedirect || "/admin",
        },
      },
      { status: 200 }
    );

    applySessionCookie(response, token, maxAgeSeconds);
    return response;
  } catch (error) {
    return apiErrorResponse(error, "Unable to sign in right now.", "Auth login error:");
  }
}
