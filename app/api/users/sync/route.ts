import { apiErrorResponse } from "@/lib/apiError";
import { syncUserToDatabase } from "@/lib/syncUser";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

async function handleSync() {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const primaryEmail =
      clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      ) || clerkUser.emailAddresses?.[0];

    const email = primaryEmail?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Authenticated user has no email address" },
        { status: 400 }
      );
    }

    const result = await syncUserToDatabase({
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      username: clerkUser.username,
      picture: clerkUser.imageUrl,
      emailVerified: primaryEmail?.verification?.status === "verified",
    });

    return NextResponse.json(
      {
        success: true,
        message: result.isNewUser
          ? "User saved to database"
          : "User session synced",
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to sync user account with the database.", "Error syncing user to DB:");
  }
}

export async function POST() {
  return handleSync();
}

export async function GET() {
  return handleSync();
}

