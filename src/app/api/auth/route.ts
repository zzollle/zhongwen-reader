import { NextResponse } from "next/server";
import { ACCESS_COOKIE, accessToken, classCode } from "@/lib/access";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ required: classCode() !== null });
}

export async function POST(req: Request) {
  const expected = accessToken();
  if (!expected) return NextResponse.json({ ok: true });

  const { code } = await req.json();
  if (typeof code !== "string" || code.trim() !== classCode()) {
    return NextResponse.json({ error: "수업 코드가 맞지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 120,
    path: "/",
  });
  return res;
}
