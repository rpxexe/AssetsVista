import dbconnect from "@/lib/dbconnect";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { ensureMultiTenantIndexes, isLegacyUserIndexError } from "@/lib/userIndexes";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import UserModel from "@/models/Users.model";

export interface SyncUserInput {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  picture?: string | null;
  emailVerified?: boolean;
}

/**
 * Syncs an authenticated Clerk user to MongoDB while isolating each independent user
 * into their own workspace (`workspaceId = clerkId`), or keeping an invited user's shared `workspaceId`.
 */
export async function syncUserToDatabase(input: SyncUserInput) {
  await dbconnect();
  await ensureMultiTenantIndexes();

  const cleanEmail = input.email.trim().toLowerCase();
  const firstName = input.firstName?.trim() || "";
  const lastName = input.lastName?.trim() || "";
  const rawUsername = input.username?.trim() || "";
  const emailPrefix = cleanEmail.split("@")[0] || "user";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    rawUsername ||
    emailPrefix;

  const existingUser = await UserModel.findOne({
    $or: [{ clerkId: input.clerkId }, { email: cleanEmail }],
  });

  // Independent newly registered users (or pre-isolation users without a workspaceId)
  // own their own fresh workspace & start as superadmin of it.
  // Invited/pre-provisioned users keep the admin's `workspaceId` and assigned role.
  const workspaceId = existingUser?.workspaceId || input.clerkId;
  const assignedRole = existingUser?.workspaceId
    ? existingUser.role || "user"
    : "superadmin";
  const isNewUser = !existingUser;

  const [existingPerson, workspaceSettings] = await Promise.all([
    PeopleModel.findOne({
      userId: workspaceId,
      email: cleanEmail,
    }),
    SettingsModel.findOne({ userId: workspaceId }).select("setup_completed").lean(),
  ]);

  let personDoc = existingPerson;
  let isNewPerson = false;

  // For brand-new workspaces that haven't finished setup yet, keep directory at 0 until Setup or manual entry;
  // for active/invited workspaces, ensure the user has a linked People profile for asset checkout.
  const shouldEnsurePerson = Boolean(existingPerson || existingUser?.personId || workspaceSettings?.setup_completed);

  if (!personDoc && shouldEnsurePerson) {
    const baseUsername = (rawUsername || emailPrefix).toLowerCase();
    const usernameTaken = await PeopleModel.findOne({
      userId: workspaceId,
      username: baseUsername,
    })
      .select("_id")
      .lean();
    const uniqueUsername = usernameTaken
      ? `${baseUsername}.${Math.floor(100 + Math.random() * 900)}`
      : baseUsername;

    personDoc = await PeopleModel.create({
      userId: workspaceId,
      name: fullName,
      first_name: firstName || fullName.split(" ")[0] || emailPrefix,
      last_name: lastName || fullName.split(" ").slice(1).join(" ") || "",
      username: uniqueUsername,
      email: cleanEmail,
    });
    isNewPerson = true;
    invalidateElasticIndexCache(workspaceId);
  }

  const upsertUser = () =>
    UserModel.findOneAndUpdate(
      {
        $or: [{ clerkId: input.clerkId }, { email: cleanEmail }],
      },
      {
        $set: {
          clerkId: input.clerkId,
          workspaceId,
          email: cleanEmail,
          name: fullName,
          first_name: firstName || existingUser?.first_name,
          last_name: lastName || existingUser?.last_name,
          username: rawUsername || existingUser?.username || personDoc?.username,
          picture: input.picture || existingUser?.picture,
          ...(personDoc?._id ? { personId: personDoc._id } : {}),
          role: assignedRole,
          emailVerified: input.emailVerified ?? existingUser?.emailVerified ?? true,
          lastLogin: new Date(),
        },
      },
      { upsert: true, new: true }
    )
      .select("-__v")
      .lean();

  let userDoc;
  try {
    userDoc = await upsertUser();
  } catch (err) {
    if (isLegacyUserIndexError(err)) {
      await ensureMultiTenantIndexes(true);
      userDoc = await upsertUser();
    } else {
      throw err;
    }
  }

  return {
    user: userDoc,
    person: personDoc ? (personDoc.toObject ? personDoc.toObject() : personDoc) : null,
    isNewUser,
    isNewPerson,
  };
}
