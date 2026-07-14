import Constants from "expo-constants";

export function adminApiUrls(): string[] {
  const hostUri = Constants.expoConfig?.hostUri;
  const metroHost = typeof hostUri === "string" ? hostUri.split(":")[0] : "";
  const developmentUrl = metroHost ? `http://${metroHost}:3001` : "";
  const configured = Constants.expoConfig?.extra?.ADMIN_API_URLS;
  if (Array.isArray(configured)) {
    return [...new Set([developmentUrl, ...configured.filter((url): url is string => typeof url === "string")].filter(Boolean))];
  }
  const single = Constants.expoConfig?.extra?.ADMIN_API_URL;
  return [...new Set([developmentUrl, typeof single === "string" ? single : ""].filter(Boolean))];
}

export async function fetchAdmin(path: string, init?: RequestInit) {
  const errors: string[] = [];
  for (const baseUrl of adminApiUrls()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(`${baseUrl}${path}`, { ...init, signal: init?.signal ?? controller.signal });
      clearTimeout(timeout);
      if (response.ok || (response.status < 500 && response.status !== 404)) return response;
      errors.push(`${baseUrl}: HTTP ${response.status}`);
    } catch (error) { errors.push(`${baseUrl}: ${error instanceof Error ? error.message : "connection failed"}`); }
    finally { clearTimeout(timeout); }
  }
  throw new Error(errors.length ? errors.join(" | ") : "Admin API URL is not configured");
}
