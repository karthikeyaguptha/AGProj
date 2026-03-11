/**
 * Sharing utilities for Environment Pulse
 * Supports two modes:
 * 1. URL-encoded (hash fragment) — zero-dependency, always works
 * 2. Server-side short links — via /api/share
 */

export interface ShareableEnvironment {
  name: string;
  url: string;
  group: string;
}

// ── URL-Encoded Sharing ──

/**
 * Encode an array of environments into a compact base64 string
 * suitable for embedding in a URL hash fragment.
 * Strips transient fields (id, status, lastChecked) — only name, url, group.
 */
export function encodeConfig(environments: ShareableEnvironment[]): string {
  const minimal = environments.map((e) => ({
    n: e.name,
    u: e.url,
    g: e.group,
  }));
  const json = JSON.stringify(minimal);
  // Use TextEncoder for UTF-8 safety, then btoa for base64
  const bytes = new TextEncoder().encode(json);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // URL-safe base64
}

/**
 * Decode a base64-encoded config string back into an array of environments.
 */
export function decodeConfig(encoded: string): ShareableEnvironment[] | null {
  try {
    // Restore standard base64 from URL-safe
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    // Pad if necessary
    while (b64.length % 4 !== 0) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item: { n: string; u: string; g: string }) => ({
      name: item.n || "",
      url: item.u || "",
      group: item.g || "Default",
    }));
  } catch {
    return null;
  }
}

/**
 * Build a full shareable URL with the config encoded in the hash fragment.
 */
export function buildShareUrl(
  baseUrl: string,
  environments: ShareableEnvironment[]
): string {
  const encoded = encodeConfig(environments);
  return `${baseUrl}#config=${encoded}`;
}

/**
 * Extract encoded config from a URL hash (if present).
 */
export function extractConfigFromHash(hash: string): string | null {
  if (!hash || !hash.includes("config=")) return null;
  const match = hash.match(/config=([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// ── Short Link Sharing ──

/**
 * Generate an 8-character random alphanumeric ID for server-side short links.
 */
export function generateShortId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const values = new Uint8Array(8);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < 8; i++) values[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 8; i++) id += chars[values[i] % chars.length];
  return id;
}

/**
 * Create a short link via the /api/share endpoint.
 * Returns the short ID on success, null on failure.
 */
export async function createShortLink(
  environments: ShareableEnvironment[]
): Promise<string | null> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        environments: environments.map((e) => ({
          name: e.name,
          url: e.url,
          group: e.group,
        })),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch {
    return null;
  }
}

/**
 * Fetch a shared config from the /api/share endpoint by ID.
 */
export async function fetchSharedConfig(
  id: string
): Promise<ShareableEnvironment[] | null> {
  try {
    const res = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.environments || null;
  } catch {
    return null;
  }
}
