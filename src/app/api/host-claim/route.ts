import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin, cookieName, database, hashToken, isUuid, newToken, safeFailure, setCookie } from "@/lib/server";

function eventHash() {
  const token = process.env.HUDDLING_EVENT_TOKEN || "";
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? hashToken(token) : null;
}

export async function GET() {
  try {
    const hash = eventHash();
    if (!hash) return NextResponse.json({ error: "행사 설정을 확인해 주세요." }, { status: 503 });
    const { data, error } = await database().from("ice_rooms").select("id,name,team_number,host_name")
      .eq("invite_hash", hash).not("team_number", "is", null).order("team_number");
    if (error) return safeFailure();
    return NextResponse.json({ teams: (data || []).map((room) => ({ id: room.id, name: room.name, claimed: room.host_name !== null })) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const hash = eventHash();
    if (!hash) return NextResponse.json({ error: "행사 설정을 확인해 주세요." }, { status: 503 });
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || Array.from(name).length > 40 || typeof body.id !== "string" || !isUuid(body.id)) return NextResponse.json({ error: "조와 이름을 확인해 주세요." }, { status: 400 });
    const token = newToken();
    const { data, error } = await database().from("ice_rooms").update({ host_name: name, host_hash: hashToken(token) })
      .eq("id", body.id).eq("invite_hash", hash).not("team_number", "is", null).is("host_name", null).select("id").maybeSingle();
    if (error) return safeFailure();
    if (!data) return NextResponse.json({ error: "이미 팀장이 있는 조예요. 다른 조를 선택해 주세요." }, { status: 409 });
    const response = NextResponse.json({ id: data.id });
    setCookie(response, cookieName("host", data.id), token);
    setCookie(response, "ice_event", process.env.HUDDLING_EVENT_TOKEN!);
    return response;
  } catch { return safeFailure(); }
}
