import { redirect } from "next/navigation";

/** Legacy /brand URL — canonical brand workspace lives at /branding. */
export default async function BrandLegacyRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/branding`);
}
