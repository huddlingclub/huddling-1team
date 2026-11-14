import { NextRequest, NextResponse } from "next/server";
import { database, safeFailure } from "@/lib/server";
import { currentEventRooms, eventName, myRoomId } from "@/lib/event-server";

export async function GET(request: NextRequest) {
  try {
    const db = database();
    const rooms = await currentEventRooms(db);
    const roomIds = rooms.map((room) => room.id);
    const [profileResult, mine] = await Promise.all([
      roomIds.length ? db.from("ice_profiles").select("id,room_id,name,occupation,experience,domains,introduction")
        .in("room_id", roomIds).order("created_at").order("id") : { data: [], error: null },
      myRoomId(request, rooms, db),
    ]);
    if (profileResult.error) return safeFailure();
    const teams = rooms.map((room) => {
      const cards = (profileResult.data || []).filter((profile) => profile.room_id === room.id)
        .map(({ room_id: _roomId, ...card }) => card);
      return { id: room.id, number: room.team_number, name: room.name, count: cards.length, cards };
    });
    return NextResponse.json({ event: { name: eventName }, myRoomId: mine, teams },
      { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
