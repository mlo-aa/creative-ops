import type { SupabaseClient } from "@supabase/supabase-js";
import type { DesignDocument } from "@/core/design/document";
import type { DesignState } from "@/core/types";

export type DesignVersionRow = {
  id: string;
  design_id: string;
  version_number: number;
  document: DesignDocument | null;
  design_state: DesignState;
  label: string;
  created_at: string;
};

export async function listDesignVersions(
  client: SupabaseClient,
  designId: string,
): Promise<DesignVersionRow[]> {
  const { data, error } = await client
    .from("design_versions")
    .select("*")
    .eq("design_id", designId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DesignVersionRow[];
}

export async function createDesignVersion(
  client: SupabaseClient,
  designId: string,
  document: DesignDocument | undefined,
  designState: DesignState,
  label = "",
): Promise<DesignVersionRow> {
  const { data: existing } = await client
    .from("design_versions")
    .select("version_number")
    .eq("design_id", designId)
    .order("version_number", { ascending: false })
    .limit(1);

  const versionNumber = ((existing?.[0]?.version_number as number) ?? 0) + 1;

  const row = {
    design_id: designId,
    version_number: versionNumber,
    document: document ?? null,
    design_state: designState,
    label: label || `Version ${versionNumber}`,
  };

  const { data, error } = await client.from("design_versions").insert(row).select().single();
  if (error) throw error;
  return data as DesignVersionRow;
}

export async function getDesignVersion(
  client: SupabaseClient,
  versionId: string,
): Promise<DesignVersionRow | null> {
  const { data, error } = await client.from("design_versions").select("*").eq("id", versionId).maybeSingle();
  if (error) throw error;
  return data as DesignVersionRow | null;
}
