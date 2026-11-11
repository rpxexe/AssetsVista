import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { canActorAccessDevTools } from "@/lib/devTools";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import UserModel from "@/models/Users.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    await dbconnect();
    const person = actor.dbUser.personId
      ? await PeopleModel.findById(actor.dbUser.personId)
          .select("_id name email username")
          .lean()
      : await PeopleModel.findOne({
          userId: actor.workspaceId,
          email: actor.dbUser.email,
        })
          .select("_id name email username")
          .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          user: actor.dbUser,
          person: person || null,
          role: actor.role,
          permissions: actor.permissions,
          canAccessDevTools: canActorAccessDevTools(actor),
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to verify session.", "Auth me error:");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const body = await req.json();
    const nextName = typeof body.name === "string" ? body.name.trim() : "";
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    const updates: Record<string, unknown> = {};
    if (nextName) {
      if (nextName.length < 2) {
        return NextResponse.json(
          { success: false, message: "Display name must be at least 2 characters." },
          { status: 400 }
        );
      }
      const [firstName, ...rest] = nextName.split(/\s+/);
      updates.name = nextName;
      updates.first_name = firstName;
      updates.last_name = rest.join(" ") || "";
    }

    if (newPassword) {
      const settings = await SettingsModel.findOne({ userId: actor.workspaceId })
        .select("min_password_length")
        .lean<{ min_password_length?: number } | null>();
      const minLen = Math.max(6, Number(settings?.min_password_length) || 6);

      if (newPassword.length < minLen) {
        return NextResponse.json(
          {
            success: false,
            message: `New password must be at least ${minLen} characters long.`,
          },
          { status: 400 }
        );
      }

      const dbUser: any = await UserModel.findById(actor.userId)
        .select("+passwordHash")
        .lean();
      if (!dbUser?.passwordHash || !verifyPassword(currentPassword, dbUser.passwordHash)) {
        return NextResponse.json(
          { success: false, message: "Current password is incorrect." },
          { status: 400 }
        );
      }

      updates.passwordHash = hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "No profile changes were provided." },
        { status: 400 }
      );
    }

    const updated = await UserModel.findByIdAndUpdate(
      actor.userId,
      { $set: updates },
      { new: true }
    )
      .select("-passwordHash -__v")
      .lean();

    if (nextName && actor.dbUser.personId) {
      await PeopleModel.updateOne(
        { _id: actor.dbUser.personId, userId: actor.workspaceId },
        {
          $set: {
            name: nextName,
            first_name: updates.first_name,
            last_name: updates.last_name,
          },
        }
      ).catch(() => null);
    }

    return NextResponse.json(
      {
        success: true,
        message: newPassword
          ? "Profile and password updated successfully."
          : "Profile updated successfully.",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Unable to update your account.", "Profile update error:");
  }
}
