import { NextRequest, NextResponse } from "next/server";
import { profileInputSchema } from "@/lib/profile";
import { currentEventToken, findMyProfile, isCurrentEventRoom } from "@/lib/event-server";
import { allowedOrigin, cookieName, database, getRoom, hashToken, newToken, safeFailure, setCookie } from "@/lib/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const eventToken = currentEventToken();
    if (!eventToken) return safeFailure();
    const { id } = await params;
    const room = await getRoom(id);
    if (!room || !isCurrentEventRoom(room)) return NextResponse.json({ error: "조를 찾을 수 없어요." }, { status: 404 });
    const db = database();
    let roomIds = [id];
    if (room.team_number != null) {
      const { data, error } = await db.from("ice_rooms").select("id").eq("invite_hash", room.invite_hash)
        .gte("team_number", 1).lte("team_number", 15);
      if (error) return safeFailure();
      roomIds = (data || []).map((item) => item.id);
    }
    const existing = await findMyProfile(request, roomIds, db);
    if (existing) return NextResponse.json({ error: "이 기기에서 이미 카드를 작성했어요.", roomId: existing.room_id }, { status: 409 });
    const input = profileInputSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "입력 내용을 확인해 주세요." }, { status: 400 });
    const token = newToken();
    const { data: profileId, error } = await db.rpc("ice_join_profile", {
      p_room: id, p_token_hash: hashToken(token), p_name: input.data.name, p_occupation: input.data.occupation,
      p_experience: input.data.experience, p_domains: input.data.domains, p_introduction: input.data.introduction, p_social_url: input.data.socialUrl,
    });
    if (error || !profileId) return NextResponse.json({ error: "참여가 마감됐거나 정원이 찼어요." }, { status: 409 });
    const response = NextResponse.json({ id: profileId });
    setCookie(response, cookieName("profile", id), token);
    setCookie(response, cookieName("room", id), eventToken);
    return response;
  } catch { return safeFailure(); }
}
