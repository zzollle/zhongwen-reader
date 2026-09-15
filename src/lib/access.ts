import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "class_access";

function token(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** 수업 코드가 설정되지 않은 환경(로컬 개발)에서는 게이트를 열어둔다. */
export function classCode(): string | null {
  const code = process.env.CLASS_CODE;
  return code && code.trim() ? code.trim() : null;
}

export function accessToken(): string | null {
  const code = classCode();
  return code ? token(code) : null;
}

export async function hasClassAccess(): Promise<boolean> {
  const expected = accessToken();
  if (!expected) return true;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === expected;
}

/** 접근 권한이 없으면 응답을 돌려주고, 있으면 null을 돌려준다. */
export async function requireClassAccess(): Promise<NextResponse | null> {
  if (await hasClassAccess()) return null;
  return NextResponse.json(
    { error: "수업 코드를 먼저 입력해 주세요.", needCode: true },
    { status: 401 },
  );
}

export const ACCESS_COOKIE = COOKIE;
