import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;
import { createQuestions } from "@/lib/ai-server";
import { access, allowedOrigin, database, getRoom, safeFailure, toProfile, type ProfileRow } from "@/lib/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const { id } = await params;
    const room = await getRoom(id);
    if (!room || !access(request, room).isHost) return NextResponse.json({ error: "방장만 질문을 만들 수 있어요." }, { status: 403 });
    const db = database();
    const { data: generation, error: claimError } = await db.rpc("ice_begin_questions", { p_room: id });
    if (claimError) return safeFailure();
    if (!generation) return NextResponse.json({ error: "참여자를 확인하거나 잠시 기다려 주세요." }, { status: 409 });
    const { data, error } = await db.from("ice_profiles")
      .select("id,room_id,name,occupation,experience,domains,introduction,social_url").eq("room_id", id).order("created_at").limit(30);
    if (error) return safeFailure();
    const profiles = ((data || []) as ProfileRow[]).map(toProfile);
    const { data: currentRoom, error: roomError } = await db.from("ice_rooms").select("topic_attempts").eq("id", id).single();
    if (roomError) return safeFailure();
    const { data: prev } = await db.from("ice_questions").select("text").eq("room_id", id).order("position");
    const result = await createQuestions(profiles, Math.max(0, (currentRoom?.topic_attempts || 1) - 1), (prev || []).map((q: { text: string }) => q.text));
    const { data: finished, error: saveError } = await db.rpc("ice_finish_questions", {
      p_room: id, p_generation: generation, p_questions: result.questions, p_source: result.source,
    });
    if (saveError || !finished) return safeFailure();
    const { data: savedRoom, error: savedError } = await db.from("ice_rooms").select("topics_generated_at").eq("id", id).single();
    if (savedError || !savedRoom) return safeFailure();
    return NextResponse.json({ source: result.source, generatedAt: savedRoom.topics_generated_at });
  } catch { return safeFailure(); }
}
