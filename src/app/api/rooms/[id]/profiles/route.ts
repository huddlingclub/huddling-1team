import { NextRequest, NextResponse } from "next/server";
import { profileInputSchema } from "@/lib/profile";
import { access, allowedOrigin, cookieName, database, getRoom, hashToken, newToken, safeFailure, setCookie } from "@/lib/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const { id } = await params;
    const room = await getRoom(id);
    if (!room || !access(request, room).canView) return NextResponse.json({ error: "초대 링크가 필요해요." }, { status: 403 });
    const input = profileInputSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "입력 내용을 확인해 주세요." }, { status: 400 });
    const db = database();
    const existingToken = request.cookies.get(cookieName("profile", id))?.value;
    if (existingToken && /^[A-Za-z0-9_-]{43}$/.test(existingToken)) {
      const { data: existing, error } = await db.from("ice_profiles").select("id").eq("room_id", id).eq("token_hash", hashToken(existingToken)).maybeSingle();
      if (error) return safeFailure();
      if (existing) return NextResponse.json({ error: "이 기기에서 이미 카드를 작성했어요." }, { status: 409 });
    }
    const token = newToken();
    const { data: profileId, error } = await db.rpc("ice_join_profile", {
      p_room: id, p_token_hash: hashToken(token), p_name: input.data.name, p_occupation: input.data.occupation,
      p_experience: input.data.experience, p_domains: input.data.domains, p_introduction: input.data.introduction, p_social_url: input.data.socialUrl,
    });
    if (error || !profileId) return NextResponse.json({ error: "참여가 마감됐거나 정원이 찼어요." }, { status: 409 });
    const response = NextResponse.json({ id: profileId });
    setCookie(response, cookieName("profile", id), token);
    return response;
  } catch { return safeFailure(); }
}
