import { NextRequest, NextResponse } from "next/server";
import { access, cookieName, database, getRoom, hashToken, safeFailure, toProfile, type ProfileRow } from "@/lib/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const room = await getRoom(id);
    if (!room) return NextResponse.json({ error: "조를 찾을 수 없어요." }, { status: 404 });
    const { isHost, canView } = access(request, room);
    if (!canView) return NextResponse.json({ error: "행사 초대 링크가 필요해요." }, { status: 403 });
    const db = database();
    const [profileResult, questionResult] = await Promise.all([
      db.from("ice_profiles").select("id,room_id,name,occupation,experience,domains,introduction,social_url").eq("room_id", id).order("created_at"),
      db.from("ice_questions").select("id,text,position,source").eq("room_id", id).lt("position", 3).order("position"),
    ]);
    if (profileResult.error || questionResult.error) return safeFailure();
    const profiles = ((profileResult.data || []) as ProfileRow[]).map(toProfile);
    const token = request.cookies.get(cookieName("profile", id))?.value;
    let myProfileId: string | null = null;
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      const { data, error } = await db.from("ice_profiles").select("id").eq("room_id", id).eq("token_hash", hashToken(token)).maybeSingle();
      if (error) return safeFailure();
      myProfileId = data?.id || null;
    }
    return NextResponse.json({ room: { id: room.id, name: room.name, phase: room.phase }, profiles, myProfileId, isHost,
      questions: (questionResult.data || []).map((item) => ({ id: item.id, text: item.text })),
      source: questionResult.data?.[0]?.source || null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
