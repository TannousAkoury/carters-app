import Constants from "expo-constants";

export function adminApiUrls(): string[] {
  const configured = Constants.expoConfig?.extra?.ADMIN_API_URLS;
  if (Array.isArray(configured)) return configured.filter((url): url is string => typeof url === "string");
  const single = Constants.expoConfig?.extra?.ADMIN_API_URL;
  return typeof single === "string" ? [single] : [];
}

export async function fetchAdmin(path: string, init?: RequestInit) {
  const errors: string[] = [];
  for (const baseUrl of adminApiUrls()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(`${baseUrl}${path}`, { ...init, signal: init?.signal ?? controller.signal });
      clearTimeout(timeout);
      if (response.ok || response.status < 500) return response;
      errors.push(`${baseUrl}: HTTP ${response.status}`);
    } catch (error) { errors.push(`${baseUrl}: ${error instanceof Error ? error.message : "connection failed"}`); }
    finally { clearTimeout(timeout); }
  }
  throw new Error(errors.length ? errors.join(" | ") : "Admin API URL is not configured");
}
