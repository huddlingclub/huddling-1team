import { NextRequest, NextResponse } from "next/server";
import { adminEventHash, isAdmin } from "@/lib/admin";
import { allowedOrigin, database, hashToken, isUuid, newToken, safeFailure } from "@/lib/server";

export async function GET(request: NextRequest) {
  if (!isAdmin(request.cookies.get("ice_admin")?.value)) return NextResponse.json({ error: "운영진 로그인이 필요해요." }, { status: 401 });
  try {
    const hash = adminEventHash(); if (!hash) return safeFailure();
    const db = database();
    const { data: rooms, error } = await db.from("ice_rooms").select("id,name,host_name,team_number").eq("invite_hash", hash).not("team_number", "is", null).order("team_number");
    if (error) return safeFailure();
    const ids = (rooms || []).map((r) => r.id);
    if (!ids.length) return NextResponse.json({ teams: [] });
    const [profiles, questions] = await Promise.all([
      db.from("ice_profiles").select("id,room_id,name").in("room_id", ids).order("created_at"),
      db.from("ice_questions").select("room_id").in("room_id", ids),
    ]);
    if (profiles.error || questions.error) return safeFailure();
    return NextResponse.json({ teams: (rooms || []).map((room) => ({ ...room,
      profiles: (profiles.data || []).filter((p) => p.room_id === room.id),
      hasQuestions: (questions.data || []).some((q) => q.room_id === room.id) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  if (!isAdmin(request.cookies.get("ice_admin")?.value)) return NextResponse.json({ error: "운영진 로그인이 필요해요." }, { status: 401 });
  try {
    const hash = adminEventHash(); if (!hash) return safeFailure();
    const body = await request.json();
    if (typeof body.roomId !== "string" || !isUuid(body.roomId)) return NextResponse.json({ error: "조를 확인해 주세요." }, { status: 400 });
    const db = database();
    if (body.action === "release") {
      const { data, error } = await db.from("ice_rooms").update({ host_name: null, host_hash: hashToken(newToken()) }).eq("id", body.roomId)
        .eq("invite_hash", hash).not("team_number", "is", null).select("id").maybeSingle();
      if (error) return safeFailure();
      if (!data) return NextResponse.json({ error: "조를 찾을 수 없어요." }, { status: 404 });
    } else if (body.action === "delete-profile" && typeof body.profileId === "string" && isUuid(body.profileId)) {
      const { data: room, error: roomError } = await db.from("ice_rooms").select("id").eq("id", body.roomId).eq("invite_hash", hash).not("team_number", "is", null).maybeSingle();
      if (roomError) return safeFailure();
      if (!room) return NextResponse.json({ error: "조를 찾을 수 없어요." }, { status: 404 });
      const { data, error } = await db.from("ice_profiles").delete().eq("id", body.profileId).eq("room_id", body.roomId).select("id").maybeSingle();
      if (error?.code === "23503") return NextResponse.json({ error: "기존 투표에 연결된 프로필은 삭제할 수 없어요." }, { status: 409 });
      if (error) return safeFailure();
      if (!data) return NextResponse.json({ error: "프로필을 찾을 수 없어요." }, { status: 404 });
    } else return NextResponse.json({ error: "요청을 확인해 주세요." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch { return safeFailure(); }
}
