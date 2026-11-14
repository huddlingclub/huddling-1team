import "server-only";
import type { NextRequest } from "next/server";
import { cookieName, database, hashToken, validHost, validInvite, type RoomRow } from "./server";

export const eventName = "허들링 아이스브레이커";

export function currentEventToken() {
  const token = process.env.HUDDLING_EVENT_TOKEN || "";
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function isCurrentEventRoom(room: RoomRow) {
  const token = currentEventToken();
  return !!token && room.team_number != null && room.team_number >= 1 && room.team_number <= 15
    && room.invite_hash === hashToken(token);
}

export async function currentEventRooms(db: ReturnType<typeof database>) {
  const token = currentEventToken();
  if (!token) throw new Error("event_not_configured");
  const { data, error } = await db.from("ice_rooms").select("id,name,team_number,host_name,invite_hash,host_hash")
    .eq("invite_hash", hashToken(token)).gte("team_number", 1).lte("team_number", 15).order("team_number");
  if (error) throw error;
  return (data || []) as RoomRow[];
}

export async function myRoomId(request: NextRequest, rooms: RoomRow[], db: ReturnType<typeof database>) {
  const mine = await findMyProfile(request, rooms.map((room) => room.id), db);
  return mine?.room_id || rooms.find((room) => hasRoomCookie(request, room))?.id || null;
}

export function hasRoomCookie(request: NextRequest, room: RoomRow) {
  return validInvite(request.cookies.get(cookieName("room", room.id))?.value, room)
    || validHost(request.cookies.get(cookieName("host", room.id))?.value, room);
}

// Match the profile cookie to its own room as well as its token hash.
export async function findMyProfile(request: NextRequest, roomIds: string[], db: ReturnType<typeof database>) {
  const tokens = new Map(roomIds.flatMap((id) => {
    const value = request.cookies.get(cookieName("profile", id))?.value;
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? [[id, hashToken(value)] as const] : [];
  }));
  if (!tokens.size) return null;
  const { data, error } = await db.from("ice_profiles").select("id,room_id,token_hash")
    .in("room_id", [...tokens.keys()]).in("token_hash", [...tokens.values()]).order("created_at");
  if (error) throw error;
  return data?.find((profile) => tokens.get(profile.room_id) === profile.token_hash) || null;
}
