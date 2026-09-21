import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * 대시보드는 교수자만 본다. 학생 기록이 들어 있으므로 비밀번호로 막는다.
 * 비밀번호가 설정되지 않았으면 아무도 못 본다 — 실수로 열려 있는 편보다 낫다.
 */
const COOKIE = "dashboard_access";

function token(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function dashboardPassword(): string | null {
  const p = process.env.DASHBOARD_PASSWORD;
  return p && p.trim() ? p.trim() : null;
}

export function matches(input: string): boolean {
  const expected = dashboardPassword();
  if (!expected) return false;
  const a = Buffer.from(token(input.trim()));
  const b = Buffer.from(token(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function accessToken(): string | null {
  const p = dashboardPassword();
  return p ? token(p) : null;
}

export async function isSignedIn(): Promise<boolean> {
  const expected = accessToken();
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === expected;
}

export const DASHBOARD_COOKIE = COOKIE;
