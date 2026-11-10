import crypto from "crypto";
import dbconnect from "@/lib/dbconnect";
import { syncUserToDatabase } from "@/lib/syncUser";
import UserModel from "@/models/Users.model";
import { NextRequest, NextResponse } from "next/server";

function verifySvixSignature(
  payload: string,
  headers: Headers,
  secret: string
): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Guard against replay attacks (> 5 minutes skew)
  const ts = Number(svixTimestamp);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Number.isNaN(ts) || Math.abs(nowSec - ts) > 300) return false;

  const secretBytes = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice(6) : secret,
    "base64"
  );

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  const signatures = svixSignature.split(" ");
  for (const sigEntry of signatures) {
    const [version, sigValue] = sigEntry.split(",");
    if (version === "v1" && sigValue) {
      const expectedBuf = Buffer.from(expectedSig);
      const actualBuf = Buffer.from(sigValue);
      if (
        expectedBuf.length === actualBuf.length &&
        crypto.timingSafeEqual(expectedBuf, actualBuf)
      ) {
        return true;
      }
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { success: false, message: "CLERK_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  if (!verifySvixSignature(rawBody, req.headers, webhookSecret)) {
    return NextResponse.json(
      { success: false, message: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    const evt = JSON.parse(rawBody);
    const eventType: string = evt.type;
    const data = evt.data;

    if (eventType === "user.created" || eventType === "user.updated") {
      const primaryEmailObj =
        data.email_addresses?.find(
          (e: any) => e.id === data.primary_email_address_id
        ) || data.email_addresses?.[0];

      const email = primaryEmailObj?.email_address;
      if (email) {
        await syncUserToDatabase({
          clerkId: data.id,
          email,
          firstName: data.first_name,
          lastName: data.last_name,
          username: data.username,
          picture: data.image_url,
          emailVerified: primaryEmailObj?.verification?.status === "verified",
        });
      }
    } else if (eventType === "user.deleted") {
      await dbconnect();
      await UserModel.findOneAndDelete({ clerkId: data.id });
    }

    return NextResponse.json({ success: true, received: true }, { status: 200 });
  } catch (error) {
    console.error("Clerk webhook processing failed:", error);
    return NextResponse.json(
      { success: false, message: "Webhook processing error" },
      { status: 500 }
    );
  }
}

