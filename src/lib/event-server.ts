import "server-only";
import type { NextRequest } from "next/server";
import { cookieName, database, hashToken, isUuid, validHost, validInvite, type RoomRow } from "./server";

export function roomCookieIds(request: NextRequest) {
  return request.cookies.getAll().flatMap(({ name }) => {
    const match = /^ice_(?:room|host)_([a-f0-9]{32})$/.exec(name);
    if (!match) return [];
    const value = match[1];
    const id = `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
    return isUuid(id) ? [id] : [];
  });
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
