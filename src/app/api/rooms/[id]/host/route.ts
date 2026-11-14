import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin, cookieName, getRoom, safeFailure, setCookie, validHost, validInvite } from "@/lib/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const { id } = await params;
    const room = await getRoom(id);
    const body: unknown = await request.json();
    const token = typeof body === "object" && body !== null && "token" in body && typeof body.token === "string" ? body.token : undefined;
    const eventToken = typeof body === "object" && body !== null && "eventToken" in body && typeof body.eventToken === "string" ? body.eventToken : undefined;
    if (!room || !validHost(token, room)) return NextResponse.json({ error: "유효하지 않은 팀장 링크예요." }, { status: 403 });
    const response = NextResponse.json({ ok: true });
    setCookie(response, cookieName("host", id), token!);
    if (eventToken && validInvite(eventToken, room) && room.team_number != null) setCookie(response, "ice_event", eventToken);
    return response;
  } catch { return safeFailure(); }
}
