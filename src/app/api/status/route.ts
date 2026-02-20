import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    // We do a GET request (or HEAD, but some servers block HEAD)
    const response = await fetch(url, { 
      method: "GET", 
      cache: "no-store",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    return NextResponse.json({
      url,
      status: response.status,
      ok: response.ok,
      isUp: response.ok,
    });
  } catch (error) {
    return NextResponse.json({
      url,
      status: 0,
      ok: false,
      isUp: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
