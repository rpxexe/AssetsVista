import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { extractBearerToken } from "@/lib/apiKeyFormat";
import { hashApiKeyToken } from "@/lib/apiKeys";
import dbconnect from "@/lib/dbconnect";
import {
  getPermissionsForRole,
  normalizeUserRole,
  RolePermissions,
  UserRole,
} from "@/lib/rbac";
import { SESSION_COOKIE_NAME, SessionPayload, verifySessionToken } from "@/lib/session";
import { ApiKeyModel } from "@/models/ApiKey.model";
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

export type AuthMethod = "session" | "api_key";

export interface AuthContext {
  actor: AuthenticatedActor;
  method: AuthMethod;
}

const USER_SELECT_FIELDS = "_id email name role isActive personId workspaceId picture";
const LAST_USED_TOUCH_INTERVAL_MS = 60_000;

function buildAuthenticatedActor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbUser: any,
  fallbackWorkspace?: string
): AuthenticatedActor {
  const userId = dbUser._id.toString();
  const workspaceId = dbUser.workspaceId || fallbackWorkspace || userId;
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
 * Verifies an Authorization Bearer Personal Access Token against hashed MongoDB records.
 */
async function resolveBearerTokenActor(): Promise<AuthenticatedActor | null> {
  try {
    const headerStore = await headers();
    const rawBearer = extractBearerToken(headerStore.get("authorization"));
    if (!rawBearer) return null;

    await dbconnect();

    const tokenHash = hashApiKeyToken(rawBearer);
    const apiKey = await ApiKeyModel.findOne({ tokenHash })
      .select("_id userId workspaceId expiresAt revokedAt lastUsedAt")
      .lean<{
        _id: unknown;
        userId: unknown;
        workspaceId?: string;
        expiresAt?: Date | null;
        revokedAt?: Date | null;
        lastUsedAt?: Date | null;
      } | null>();

    if (!apiKey || apiKey.revokedAt) return null;
    if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    const dbUser = await UserModel.findById(apiKey.userId)
      .select(USER_SELECT_FIELDS)
      .lean();

    if (!dbUser) return null;

    const actor = buildAuthenticatedActor(dbUser, apiKey.workspaceId);
    if (!actor.dbUser.isActive || !actor.permissions.canManageApiKeys) {
      return null;
    }

    const lastUsedMs = apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).getTime() : 0;
    if (!lastUsedMs || Date.now() - lastUsedMs > LAST_USED_TOUCH_INTERVAL_MS) {
      await ApiKeyModel.updateOne(
        { _id: apiKey._id },
        { $set: { lastUsedAt: new Date() } }
      ).catch(() => null);
    }

    return actor;
  } catch {
    return null;
  }
}

/**
 * Resolves both the authenticated actor and whether auth came from a browser session or API key.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSessionFromCookies();
  if (session) {
    await dbconnect();
    const dbUser = await UserModel.findById(session.sub)
      .select(USER_SELECT_FIELDS)
      .lean();
    if (dbUser) {
      return {
        actor: buildAuthenticatedActor(dbUser, session.ws),
        method: "session",
      };
    }
  }

  const bearerActor = await resolveBearerTokenActor();
  if (bearerActor) {
    return {
      actor: bearerActor,
      method: "api_key",
    };
  }

  return null;
}

/**
 * Fast, lightweight workspace resolver for scoped API reads and mutations.
 * Supports both HTTP-only session cookies and Personal Access Tokens (`Bearer av_...`).
 */
export async function getWorkspaceUserId(): Promise<string | null> {
  const session = await getSessionFromCookies();
  if (session) {
    await dbconnect();
    const dbUser = await UserModel.findById(session.sub)
      .select("workspaceId isActive")
      .lean<{ workspaceId?: string; isActive?: boolean } | null>();

    if (dbUser && dbUser.isActive !== false) {
      return dbUser.workspaceId || session.ws || session.sub;
    }
  }

  const bearerActor = await resolveBearerTokenActor();
  return bearerActor?.workspaceId ?? null;
}

/**
 * Resolves the authenticated MongoDB user, normalized role, and RBAC permission flags.
 */
export async function getAuthenticatedActor(): Promise<AuthenticatedActor | null> {
  const ctx = await getAuthContext();
  return ctx?.actor ?? null;
}

function authorizeActorResult(
  actor: AuthenticatedActor | null,
  permission: keyof RolePermissions,
  forbiddenMessage: string
): { actor: AuthenticatedActor } | { error: NextResponse } {
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
 * Authorizes an API request against authentication, active status, and a specific RBAC permission.
 */
export async function requirePermission(
  permission: keyof RolePermissions,
  forbiddenMessage = "Forbidden: You do not have permission to perform this action."
): Promise<{ actor: AuthenticatedActor } | { error: NextResponse }> {
  const actor = await getAuthenticatedActor();
  return authorizeActorResult(actor, permission, forbiddenMessage);
}

/**
 * Authorizes sensitive key-management mutations requiring an interactive cookie session
 * (prevents bearer tokens from minting or revoking other personal access tokens).
 */
export async function requireSessionPermission(
  permission: keyof RolePermissions,
  forbiddenMessage = "Forbidden: You do not have permission to perform this action."
): Promise<{ actor: AuthenticatedActor } | { error: NextResponse }> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (ctx.method !== "session") {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Interactive browser session required to create or revoke API keys.",
        },
        { status: 403 }
      ),
    };
  }
  return authorizeActorResult(ctx.actor, permission, forbiddenMessage);
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
