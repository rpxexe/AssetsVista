import { redirect } from "next/navigation";

interface SignInCatchAllProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function SignInRedirectPage({ searchParams }: SignInCatchAllProps) {
  const query = await searchParams;
  const rawRedirect = typeof query?.redirect_url === "string" ? query.redirect_url : "";
  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    redirect(`/login?redirect_url=${encodeURIComponent(rawRedirect)}`);
  }

  redirect("/login");
}
