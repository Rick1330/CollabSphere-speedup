export type OAuthFragmentPayload = {
  accessToken?: string;
  csrfToken?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    globalRole?: "USER" | "ADMIN";
    authProvider?: "local" | "google";
  };
};

export function parseOAuthFragment(rawHash: string): OAuthFragmentPayload | null {
  if (!rawHash.startsWith("#oauth=")) return null;
  try {
    const json = decodeURIComponent(rawHash.slice("#oauth=".length));
    return JSON.parse(json) as OAuthFragmentPayload;
  } catch {
    return null;
  }
}
