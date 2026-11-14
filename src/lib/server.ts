import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Profile } from "./profile";

export type RoomRow = { id: string; name: string; invite_hash: string; host_hash: string; phase: "collecting" | "generating" | "voting" | "finished"; team_number?: number | null; topics_generated_at: string | null };
export type ProfileRow = {
  id: string; room_id: string; name: string; occupation: Profile["occupation"];
  experience: Profile["experience"]; domains: Profile["domains"]; introduction: string; social_url: string;
};

export function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
export function database() {
  if (!configured()) throw new Error("database_not_configured");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function newToken() { return randomBytes(32).toString("base64url"); }
export function hashToken(value: string) { return createHash("sha256").update(value).digest("hex"); }
function matchesToken(value: string | undefined, hash: string) {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value) || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(hashToken(value), "hex"), Buffer.from(hash, "hex"));
}
export function cookieName(type: "host" | "room" | "profile", roomId: string) {
  return `ice_${type}_${roomId.replaceAll("-", "")}`;
}
export function setCookie(response: NextResponse, name: string, value: string) {
  response.cookies.set(name, value, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}
export function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return new URL(origin).origin === new URL(expected).origin;
  } catch { return false; }
}
export function isUuid(value: string) { return z.string().uuid().safeParse(value).success; }
export function toProfile(row: ProfileRow): Profile {
  return { id: row.id, name: row.name, occupation: row.occupation, experience: row.experience,
    domains: row.domains, introduction: row.introduction, socialUrl: row.social_url };
}
export async function getRoom(roomId: string): Promise<RoomRow | null> {
  if (!isUuid(roomId)) return null;
  const { data, error } = await database().from("ice_rooms")
    .select("id,name,invite_hash,host_hash,phase,team_number,topics_generated_at").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data as RoomRow | null;
}
export function access(request: NextRequest, room: RoomRow) {
  const isHost = matchesToken(request.cookies.get(cookieName("host", room.id))?.value, room.host_hash);
  const canView = isHost || matchesToken(request.cookies.get(cookieName("room", room.id))?.value, room.invite_hash)
    || (room.team_number != null && matchesToken(request.cookies.get("ice_event")?.value, room.invite_hash));
  return { isHost, canView };
}
export function validInvite(value: string | undefined, room: RoomRow) { return matchesToken(value, room.invite_hash); }
export function validHost(value: string | undefined, room: RoomRow) { return matchesToken(value, room.host_hash); }
export function safeFailure() {
  return NextResponse.json({ error: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
}
