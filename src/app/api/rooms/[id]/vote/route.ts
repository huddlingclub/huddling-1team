import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { access, allowedOrigin, cookieName, database, getRoom, hashToken, safeFailure } from "@/lib/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const { id } = await params;
    const room = await getRoom(id);
    if (!room || !access(request, room).canView) return NextResponse.json({ error: "초대 링크가 필요해요." }, { status: 403 });
    const input = z.object({ questionId: z.string().uuid() }).safeParse(await request.json());
    const token = request.cookies.get(cookieName("profile", id))?.value;
    if (!input.success || !token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      return NextResponse.json({ error: "프로필을 먼저 등록해 주세요." }, { status: 400 });
    const { data, error } = await database().rpc("ice_cast_vote", {
      p_room: id, p_token_hash: hashToken(token), p_question: input.data.questionId,
    });
    if (error) return safeFailure();
    if (!data) return NextResponse.json({ error: "투표할 수 없거나 투표가 종료됐어요." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch { return safeFailure(); }
}
