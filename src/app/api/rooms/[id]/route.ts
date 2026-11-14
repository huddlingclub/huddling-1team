import { NextRequest, NextResponse } from "next/server";
import { access, cookieName, database, getRoom, hashToken, safeFailure, toProfile, type ProfileRow } from "@/lib/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const room = await getRoom(id);
    if (!room) return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
    const { isHost, canView } = access(request, room);
    if (!canView) return NextResponse.json({ error: "초대 링크가 필요해요." }, { status: 403 });
    const db = database();
    const [profileResult, questionResult, voteResult] = await Promise.all([
      db.from("ice_profiles").select("id,room_id,name,occupation,experience,domains,introduction,social_url").eq("room_id", id).order("created_at"),
      db.from("ice_questions").select("id,text,position,source").eq("room_id", id).order("position"),
      db.from("ice_votes").select("profile_id,question_id").eq("room_id", id),
    ]);
    if (profileResult.error || questionResult.error || voteResult.error) return safeFailure();
    const profiles = ((profileResult.data || []) as ProfileRow[]).map(toProfile);
    const token = request.cookies.get(cookieName("profile", id))?.value;
    let myProfileId: string | null = null;
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      const { data, error } = await db.from("ice_profiles").select("id").eq("room_id", id).eq("token_hash", hashToken(token)).maybeSingle();
      if (error) return safeFailure();
      myProfileId = data?.id || null;
    }
    const votes = voteResult.data || [];
    const questions = (questionResult.data || []).map((item) => ({
      id: item.id, text: item.text, votes: votes.filter((vote) => vote.question_id === item.id).length,
    }));
    let inviteUrl: string | null = null;
    if (isHost) {
      const token = request.cookies.get(cookieName("room", id))?.value;
      if (token) {
        const base = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const url = new URL(`/room/${id}/join`, base);
        url.hash = token;
        inviteUrl = url.toString();
      }
    }
    const myVote = votes.find((vote) => vote.profile_id === myProfileId)?.question_id || null;
    return NextResponse.json({ room: { id: room.id, name: room.name, phase: room.phase },
      profiles, myProfileId, isHost, inviteUrl, questions, myVote, voteCount: votes.length,
      source: questionResult.data?.[0]?.source || null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return safeFailure(); }
}
