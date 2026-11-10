import dbconnect from "@/lib/dbconnect";
import { getPermissionsForRole, RolePermissions, UserRole } from "@/lib/rbac";
import { syncUserToDatabase } from "@/lib/syncUser";
import UserModel from "@/models/Users.model";
import { auth, currentUser } from "@clerk/nextjs/server";

export interface AuthenticatedActor {
  clerkId: string;
  workspaceId: string;
  dbUser: {
    _id: string;
    email: string;
    name?: string;
    role: UserRole;
    isActive: boolean;
    personId?: string;
    workspaceId: string;
  };
  role: UserRole;
  permissions: RolePermissions;
}

/**
 * Fast, lightweight workspace resolver for scoped API reads and mutations.
 * Reads the Clerk session locally via `auth()` without an extra Clerk API roundtrip,
 * then resolves the user's shared `workspaceId` (defaulting to their own `clerkId`).
 */
export async function getWorkspaceUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  await dbconnect();
  const dbUser = await UserModel.findOne({ clerkId: userId })
    .select("workspaceId clerkId")
    .lean<{ workspaceId?: string; clerkId?: string } | null>();

  return dbUser?.workspaceId || userId;
}

/**
 * Resolves the authenticated Clerk user and their persisted MongoDB role & permissions.
 * Auto-provisions the user record in MongoDB if they have not yet synced.
 */
export async function getAuthenticatedActor(): Promise<AuthenticatedActor | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  await dbconnect();

  let dbUser: any = await UserModel.findOne({ clerkId: clerkUser.id })
    .select("_id email name role isActive personId workspaceId")
    .lean();

  if (!dbUser) {
    const primaryEmail =
      clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      ) || clerkUser.emailAddresses?.[0];

    const email = primaryEmail?.emailAddress;
    if (!email) return null;

    const synced = await syncUserToDatabase({
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      username: clerkUser.username,
      picture: clerkUser.imageUrl,
      emailVerified: primaryEmail?.verification?.status === "verified",
    });
    dbUser = synced.user;
  }

  if (!dbUser) return null;

  const workspaceId = dbUser.workspaceId || clerkUser.id;
  const role: UserRole = (dbUser.role || "user") as UserRole;

  return {
    clerkId: clerkUser.id,
    workspaceId,
    dbUser: {
      _id: dbUser._id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role,
      isActive: dbUser.isActive !== false,
      personId: dbUser.personId ? dbUser.personId.toString() : undefined,
      workspaceId,
    },
    role,
    permissions: getPermissionsForRole(role),
  };
}
