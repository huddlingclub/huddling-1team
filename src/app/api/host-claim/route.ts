import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin, cookieName, database, hashToken, isUuid, newToken, safeFailure, setCookie } from "@/lib/server";
import { profileInputSchema } from "@/lib/profile";
import { currentEventRooms, findMyProfile } from "@/lib/event-server";

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
    const input = profileInputSchema.safeParse(body);
    if (!input.success || typeof body.id !== "string" || !isUuid(body.id)) return NextResponse.json({ error: "조와 프로필 입력을 확인해 주세요." }, { status: 400 });
    const db = database();
    const rooms = await currentEventRooms(db);
    if (!rooms.some((room) => room.id === body.id)) return NextResponse.json({ error: "조를 찾을 수 없어요." }, { status: 404 });
    const existing = await findMyProfile(request, rooms.map((room) => room.id), db);
    if (existing) return NextResponse.json({ error: "이 기기에서 이미 카드를 작성했어요.", roomId: existing.room_id }, { status: 409 });
    const token = newToken(), profileToken = newToken();
    const { data, error } = await db.rpc("ice_claim_host_profile", {
      p_room: body.id, p_event_hash: hash, p_host_hash: hashToken(token), p_token_hash: hashToken(profileToken),
      p_name: input.data.name, p_occupation: input.data.occupation, p_experience: input.data.experience,
      p_domains: input.data.domains, p_introduction: input.data.introduction, p_social_url: input.data.socialUrl,
    });
    if (error) return NextResponse.json({ error: "프로필을 등록하지 못했어요. 참여 인원을 확인해 주세요." }, { status: 409 });
    if (!data) return NextResponse.json({ error: "이미 팀장이 있는 조예요. 다른 조를 선택해 주세요." }, { status: 409 });
    const response = NextResponse.json({ id: body.id });
    setCookie(response, cookieName("host", body.id), token);
    setCookie(response, cookieName("profile", body.id), profileToken);
    setCookie(response, cookieName("room", body.id), process.env.HUDDLING_EVENT_TOKEN!);
    setCookie(response, "ice_event", process.env.HUDDLING_EVENT_TOKEN!);
    return response;
  } catch { return safeFailure(); }
}
