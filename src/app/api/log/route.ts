import { NextResponse } from "next/server";
import { classCode } from "@/lib/access";

export const runtime = "nodejs";

const EVENTS = new Set([
  "analyze",
  "play_all",
  "play_by_chunk",
  "play_chunk",
  "play_word",
  "play_collocation",
]);

/**
 * 학습 기록 수신. 켜져 있지 않으면 아무것도 저장하지 않는다.
 * 브라우저 쪽에도 같은 스위치가 있지만, 서버에서 한 번 더 막는다.
 */
export async function POST(req: Request) {
  const enabled = process.env.LOGGING_ENABLED === "true";
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!enabled || !url || !key) {
    // 기록을 받지 않는 상태. 브라우저는 실패를 무시하므로 조용히 끝낸다.
    return new NextResponse(null, { status: 204 });
  }

  let body: {
    subject?: unknown;
    code?: unknown;
    event?: unknown;
    sentence?: unknown;
    detail?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const subject = typeof body.subject === "string" ? body.subject : null;
  const event = typeof body.event === "string" ? body.event : null;

  if (!subject || !event || !EVENTS.has(event)) {
    return new NextResponse(null, { status: 204 });
  }

  // 수업 코드는 신원 확인이 아니라 집단 표시로만 쓴다
  const expected = classCode();
  const cohort =
    expected && typeof body.code === "string" && body.code.trim() === expected
      ? "class"
      : "public";

  const sentence =
    typeof body.sentence === "string" ? body.sentence.slice(0, 300) : null;

  const row = {
    subject,
    cohort,
    research_ok: cohort === "class",
    event,
    sentence,
    detail: body.detail ?? null,
  };

  try {
    const res = await fetch(`${url}/rest/v1/study_events`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) console.error("기록 저장 실패", res.status, await res.text());
  } catch (error) {
    console.error("기록 저장 실패", error);
  }

  return new NextResponse(null, { status: 204 });
}
