import { NextRequest, NextResponse } from "next/server";
import { database, hashToken, safeFailure } from "@/lib/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("ice_event")?.value || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({ error: "행사 초대 링크가 필요해요." }, { status: 403 });
    const db = database();
    const { data: rooms, error } = await db.from("ice_rooms").select("id,name,team_number")
      .eq("invite_hash", hashToken(token)).not("team_number", "is", null).order("team_number");
    if (error) return safeFailure();
    if (!rooms?.length) return NextResponse.json({ error: "행사를 찾을 수 없어요." }, { status: 403 });
    const { data: profiles, error: profileError } = await db.from("ice_profiles").select("room_id").in("room_id", rooms.map((r) => r.id));
    if (profileError) return safeFailure();
    const teams = rooms.map((room) => ({ id: room.id, name: room.name, number: room.team_number,
      count: (profiles || []).filter((p) => p.room_id === room.id).length }));
    return NextResponse.json({ teams }, { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
