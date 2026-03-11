import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * File-based storage for shared dashboard configs.
 * Works on both Vercel (uses /tmp) and IIS/self-hosted (uses project data/ dir).
 */
function getStoragePath(): string {
  // On Vercel, only /tmp is writable
  const isVercel = process.env.VERCEL === "1";
  const dir = isVercel
    ? path.join("/tmp", "env-pulse-shares")
    : path.join(process.cwd(), "data", "shares");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

interface SharedConfig {
  id: string;
  environments: { name: string; url: string; group: string }[];
  createdAt: string;
}

/**
 * POST /api/share
 * Store a dashboard config, return a short ID.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { environments } = body;

    if (!environments || !Array.isArray(environments) || environments.length === 0) {
      return NextResponse.json(
        { error: "No environments provided" },
        { status: 400 }
      );
    }

    // Sanitize — only keep name, url, group
    const sanitized = environments.map(
      (e: { name?: string; url?: string; group?: string }) => ({
        name: e.name || "",
        url: e.url || "",
        group: e.group || "Default",
      })
    );

    const id = generateId();
    const config: SharedConfig = {
      id,
      environments: sanitized,
      createdAt: new Date().toISOString(),
    };

    const dir = getStoragePath();
    const filePath = path.join(dir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({ id, url: `/s/${id}` });
  } catch (error) {
    console.error("Share create error:", error);
    return NextResponse.json(
      { error: "Failed to create shared link" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share?id=abc123
 * Retrieve a stored shared config by ID.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id || !/^[A-Za-z0-9]{1,20}$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid or missing ID" },
      { status: 400 }
    );
  }

  const dir = getStoragePath();
  const filePath = path.join(dir, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: "Shared config not found" },
      { status: 404 }
    );
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const config: SharedConfig = JSON.parse(raw);
    return NextResponse.json({
      id: config.id,
      environments: config.environments,
      createdAt: config.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to read shared config" },
      { status: 500 }
    );
  }
}
