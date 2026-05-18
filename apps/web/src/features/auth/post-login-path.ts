import { listMineWorkspaceRows } from "@/api/adapters/workspaces";

/** First workspace from API, else dashboard (IDs are DB UUIDs — not mock slugs). */
export async function postLoginPath(): Promise<string> {
  try {
    const rows = await listMineWorkspaceRows();
    const first = rows[0]?.workspace?.id;
    if (first) return `/w/${first}`;
  } catch {
    /* fall through */
  }
  return "/dashboard";
}
