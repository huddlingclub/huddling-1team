import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin } from "@/lib/server";

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ice_admin", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
