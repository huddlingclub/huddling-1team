import { NextRequest, NextResponse } from "next/server";
import { database, safeFailure } from "@/lib/server";
import { currentEventRooms, eventName, myRoomId } from "@/lib/event-server";

export async function GET(request: NextRequest) {
  try {
    const db = database();
    const rooms = await currentEventRooms(db);
    const ids = rooms.map((room) => room.id);
    const [profileResult, mine] = await Promise.all([
      ids.length ? db.from("ice_profiles").select("room_id").in("room_id", ids) : { data: [], error: null },
      myRoomId(request, rooms, db),
    ]);
    if (profileResult.error) return safeFailure();
    const teams = rooms.map((room) => ({ id: room.id, number: room.team_number, name: room.name,
      count: (profileResult.data || []).filter((profile) => profile.room_id === room.id).length,
      hostName: room.host_name }));
    return NextResponse.json({ event: { name: eventName }, myRoomId: mine, teams }, { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
