/** Hex UUID shape accepted by the API (`workspaceId` route params). */
const POSTGRES_UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDatabaseWorkspaceId(value: string): boolean {
  return POSTGRES_UUID_PARAM_RE.test(value.trim());
}
