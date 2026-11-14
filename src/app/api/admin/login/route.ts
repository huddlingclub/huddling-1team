import { NextRequest, NextResponse } from "next/server";
import { adminCookieValue, adminCredentialsValid } from "@/lib/admin";
import { allowedOrigin, database, hashToken, safeFailure, setCookie } from "@/lib/server";

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "운영진 설정을 확인해 주세요." }, { status: 503 });
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashToken(ip);
    const db = database();
    const { data: allowed, error } = await db.rpc("ice_admin_attempt", { p_ip_hash: ipHash });
    if (error) return safeFailure();
    if (!allowed) return NextResponse.json({ error: "시도가 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
    const body = await request.json();
    if (typeof body.id !== "string" || typeof body.password !== "string" || !adminCredentialsValid(body.id, body.password))
      return NextResponse.json({ error: "비밀번호가 달라요" }, { status: 401 });
    const { error: resetError } = await db.from("ice_admin_attempts").update({ attempts: 0 }).eq("ip_hash", ipHash);
    if (resetError) return safeFailure();
    const response = NextResponse.json({ ok: true });
    setCookie(response, "ice_admin", adminCookieValue()!);
    return response;
  } catch { return safeFailure(); }
}
