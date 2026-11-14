import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin, database, hashToken, safeFailure, setCookie } from "@/lib/server";

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    const token = typeof body === "object" && body !== null && "token" in body && typeof body.token === "string" ? body.token : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({ error: "유효하지 않은 초대 링크예요." }, { status: 403 });
    const { data, error } = await database().from("ice_rooms").select("id").eq("invite_hash", hashToken(token)).not("team_number", "is", null).limit(1);
    if (error) return safeFailure();
    if (!data?.length) return NextResponse.json({ error: "유효하지 않은 초대 링크예요." }, { status: 403 });
    const response = NextResponse.json({ ok: true });
    setCookie(response, "ice_event", token);
    return response;
  } catch { return safeFailure(); }
}
