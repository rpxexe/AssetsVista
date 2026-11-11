import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { PeopleModel } from "@/models/Peoples.model";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbconnect();
    const person = actor.dbUser.personId
      ? await PeopleModel.findById(actor.dbUser.personId).lean()
      : await PeopleModel.findOne({
          userId: actor.workspaceId,
          email: actor.dbUser.email,
        }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "User session active",
        data: {
          user: actor.dbUser,
          person: person || null,
          isNewUser: false,
          isNewPerson: false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to resolve current user.", "User sync error:");
  }
}
