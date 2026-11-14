import { NextRequest, NextResponse } from "next/server";
import { database, hashToken, safeFailure, type RoomRow } from "@/lib/server";
import { findMyProfile, hasRoomCookie, roomCookieIds } from "@/lib/event-server";

export async function GET(request: NextRequest) {
  try {
    const db = database();
    const token = request.cookies.get("ice_event")?.value;
    const eventHash = token && /^[A-Za-z0-9_-]{43}$/.test(token) ? hashToken(token) : null;
    const loadRooms = (hash: string) => db.from("ice_rooms").select("id,name,team_number,invite_hash,host_hash")
      .eq("invite_hash", hash).gte("team_number", 1).lte("team_number", 15).order("team_number");
    let rooms: RoomRow[] = [];
    if (eventHash) {
      const { data, error } = await loadRooms(eventHash);
      if (error) return safeFailure();
      rooms = (data || []) as RoomRow[];
    }
    let ownRoom: RoomRow | undefined;
    if (!rooms.length) {
      const ids = roomCookieIds(request);
      if (ids.length) {
        const { data, error } = await db.from("ice_rooms").select("id,invite_hash,host_hash,team_number")
          .in("id", ids).not("team_number", "is", null).order("team_number");
        if (error) return safeFailure();
        ownRoom = (data as RoomRow[] | null)?.find((room) => hasRoomCookie(request, room));
        if (ownRoom) {
          const result = await loadRooms(ownRoom.invite_hash);
          if (result.error) return safeFailure();
          rooms = (result.data || []) as RoomRow[];
        }
      }
    }
    if (!rooms.length) return NextResponse.json({ error: "행사 초대 링크가 필요해요." }, { status: 403 });
    const roomIds = rooms.map((room) => room.id);
    const [profileResult, mine] = await Promise.all([
      db.from("ice_profiles").select("id,room_id,name,occupation,experience,domains,introduction")
        .in("room_id", roomIds).order("created_at").order("id"),
      findMyProfile(request, roomIds, db),
    ]);
    if (profileResult.error) return safeFailure();
    ownRoom = rooms.find((room) => hasRoomCookie(request, room));
    const teams = rooms.map((room) => {
      const cards = (profileResult.data || []).filter((profile) => profile.room_id === room.id)
        .map(({ room_id: _roomId, ...card }) => card);
      return { id: room.id, number: room.team_number, name: room.name, count: cards.length, cards };
    });
    return NextResponse.json({ event: { name: "허들링 아이스브레이커" }, myRoomId: mine?.room_id || ownRoom?.id || null, teams },
      { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
