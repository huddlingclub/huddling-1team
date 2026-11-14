import { NextRequest, NextResponse } from "next/server";
import { access, cookieName, database, getRoom, safeFailure, validInvite } from "@/lib/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const room = await getRoom(id);
    if (!room || !access(request, room).isHost) return NextResponse.json({ error: "팀장만 현황을 볼 수 있어요." }, { status: 403 });
    const token = [request.cookies.get("ice_event")?.value, request.cookies.get(cookieName("room", id))?.value,
      process.env.HUDDLING_EVENT_TOKEN].find((value) => validInvite(value, room));
    if (!token) return safeFailure();
    const { data, error } = await database().from("ice_profiles").select("name").eq("room_id", id).order("created_at").order("id");
    if (error) return safeFailure();
    const url = new URL(room.team_number != null ? "/event" : `/room/${id}/join`, process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin);
    url.hash = token;
    const names = (data || []).map((profile) => profile.name);
    return NextResponse.json({ inviteUrl: url.toString(), count: names.length, names }, { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
