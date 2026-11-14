import { NextRequest, NextResponse } from "next/server";
import { roomInputSchema } from "@/lib/profile";
import { allowedOrigin, cookieName, database, hashToken, newToken, safeFailure, setCookie } from "@/lib/server";

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  try {
    const result = roomInputSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "팀 이름을 확인해 주세요." }, { status: 400 });
    const hostToken = newToken();
    const inviteToken = newToken();
    const { data, error } = await database().from("ice_rooms").insert({
      name: result.data.name, host_hash: hashToken(hostToken), invite_hash: hashToken(inviteToken),
    }).select("id").single();
    if (error || !data) return safeFailure();
    const response = NextResponse.json({ id: data.id });
    setCookie(response, cookieName("host", data.id), hostToken);
    setCookie(response, cookieName("room", data.id), inviteToken);
    return response;
  } catch { return safeFailure(); }
}
