import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetLegacyDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/assets/view/${id}`);
}

