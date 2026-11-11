import { redirect } from "next/navigation";

interface SignUpCatchAllProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function SignUpRedirectPage({ searchParams }: SignUpCatchAllProps) {
  const query = await searchParams;
  const rawRedirect = typeof query?.redirect_url === "string" ? query.redirect_url : "";
  const nextQuery = new URLSearchParams({ mode: "sign-up" });
  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    nextQuery.set("redirect_url", rawRedirect);
  }

  redirect(`/login?${nextQuery.toString()}`);
}
