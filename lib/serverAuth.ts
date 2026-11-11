import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import dbconnect from "@/lib/dbconnect";
import {
  getPermissionsForRole,
  normalizeUserRole,
  RolePermissions,
  UserRole,
} from "@/lib/rbac";
import { SESSION_COOKIE_NAME, SessionPayload, verifySessionToken } from "@/lib/session";
import { AssetModel } from "@/models/Assets.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import UserModel from "@/models/Users.model";

export interface AuthenticatedActor {
  userId: string;
  workspaceId: string;
  dbUser: {
    _id: string;
    email: string;
    name?: string;
    role: UserRole;
    isActive: boolean;
    personId?: string;
    workspaceId: string;
    picture?: string;
  };
  role: UserRole;
  permissions: RolePermissions;
}

/**
 * Reads and verifies the HTTP-only signed session cookie for the current request.
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return await verifySessionToken(rawToken);
  } catch {
    return null;
  }
}

/**
 * Fast, lightweight workspace resolver for scoped API reads and mutations.
 */
export async function getWorkspaceUserId(): Promise<string | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await dbconnect();
  const dbUser = await UserModel.findById(session.sub)
    .select("workspaceId isActive")
    .lean<{ workspaceId?: string; isActive?: boolean } | null>();

  if (!dbUser || dbUser.isActive === false) return null;
  return dbUser.workspaceId || session.ws || session.sub;
}

/**
 * Resolves the authenticated MongoDB user, normalized role, and RBAC permission flags.
 */
export async function getAuthenticatedActor(): Promise<AuthenticatedActor | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await dbconnect();

  const dbUser: any = await UserModel.findById(session.sub)
    .select("_id email name role isActive personId workspaceId picture")
    .lean();

  if (!dbUser) return null;

  const userId = dbUser._id.toString();
  const workspaceId = dbUser.workspaceId || session.ws || userId;
  const role = normalizeUserRole(dbUser.role);

  return {
    userId,
    workspaceId,
    dbUser: {
      _id: userId,
      email: dbUser.email,
      name: dbUser.name,
      role,
      isActive: dbUser.isActive !== false,
      personId: dbUser.personId ? dbUser.personId.toString() : undefined,
      workspaceId,
      picture: dbUser.picture,
    },
    role,
    permissions: getPermissionsForRole(role),
  };
}

/**
 * Authorizes an API request against authentication, active status, and a specific RBAC permission.
 */
export async function requirePermission(
  permission: keyof RolePermissions,
  forbiddenMessage = "Forbidden: You do not have permission to perform this action."
): Promise<{ actor: AuthenticatedActor } | { error: NextResponse }> {
  const actor = await getAuthenticatedActor();
  if (!actor) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (!actor.dbUser.isActive) {
    return {
      error: NextResponse.json(
        { success: false, message: "Your account is suspended. Contact an Admin." },
        { status: 403 }
      ),
    };
  }
  if (!actor.permissions[permission]) {
    return {
      error: NextResponse.json(
        { success: false, message: forbiddenMessage },
        { status: 403 }
      ),
    };
  }
  return { actor };
}

/**
 * Returns true when an authenticated Admin owns a brand-new, unconfigured
 * workspace that has not completed or skipped the initial Setup Wizard yet.
 */
export async function shouldRedirectToSetup(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (!process.env.MONGODB_URI) return true;

  try {
    await dbconnect();

    const dbUser = await UserModel.findById(userId)
      .select("workspaceId role")
      .lean<{ workspaceId?: string; role?: string } | null>();

    if (!dbUser) return false;

    const role = normalizeUserRole(dbUser.role);
    if (role !== "admin") {
      return false;
    }

    const workspaceId = dbUser.workspaceId || userId;
    const settings = await SettingsModel.findOne({ userId: workspaceId })
      .select("setup_completed")
      .lean<{ setup_completed?: boolean } | null>();

    if (settings?.setup_completed) {
      return false;
    }

    // Pre-existing workspaces with existing inventory/directory skip forced setup
    const [hasAsset, hasPerson, hasCompany] = await Promise.all([
      AssetModel.exists({ userId: workspaceId }),
      PeopleModel.exists({ userId: workspaceId }),
      CompanyModel.exists({ userId: workspaceId }),
    ]);

    if (hasAsset || hasPerson || hasCompany) {
      await SettingsModel.updateOne(
        { userId: workspaceId },
        { $set: { setup_completed: true, setup_completed_at: new Date() } },
        { upsert: true }
      ).catch(() => null);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to inspect workspace setup state:", err);
    return false;
  }
}
