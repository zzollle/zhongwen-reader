import { NextResponse } from "next/server";
import { DASHBOARD_COOKIE, accessToken, matches } from "@/lib/dashboard-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (typeof password !== "string" || !matches(password)) {
    return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DASHBOARD_COOKIE, accessToken()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
