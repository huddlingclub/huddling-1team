import { NextRequest, NextResponse } from "next/server";
import { database, getRoom, safeFailure } from "@/lib/server";
import { currentEventToken, isCurrentEventRoom } from "@/lib/event-server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!currentEventToken()) return safeFailure();
    const { id } = await params;
    const room = await getRoom(id);
    if (!room || !isCurrentEventRoom(room)) return NextResponse.json({ error: "조를 찾을 수 없어요." }, { status: 404 });
    const { count, error } = await database().from("ice_profiles").select("id", { count: "exact", head: true }).eq("room_id", id);
    if (error) return safeFailure();
    return NextResponse.json({ id: room.id, number: room.team_number, name: room.name, count: count || 0, hostName: room.host_name },
      { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
