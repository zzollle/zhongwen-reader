export type Row = {
  subject: string;
  cohort: "class" | "public";
  event: string;
  sentence: string | null;
  detail: Record<string, unknown> | null;
  at: string;
};

export type Stats = {
  total: number;
  learners: number;
  analyses: number;
  byCohort: { class: number; public: number };
  daily: { date: string; class: number; public: number }[];
  topSentences: { sentence: string; count: number; learners: number }[];
  topChunks: { text: string; count: number }[];
  avgRate: number | null;
};

/** 최근 기록을 가져온다. 서버에서만 부른다 — service key가 브라우저로 나가면 안 된다. */
export async function fetchRows(limit = 5000): Promise<Row[] | null> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/study_events?select=subject,cohort,event,sentence,detail,at&order=at.desc&limit=${limit}`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error("기록 조회 실패", res.status, await res.text().catch(() => ""));
    return null;
  }
  return res.json();
}

function topBy<T>(items: T[], key: (t: T) => string | null, take: number) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([value, count]) => ({ value, count }));
}

export function summarize(rows: Row[]): Stats {
  const analyses = rows.filter((r) => r.event === "analyze");

  // 날짜별 집계. 기록이 없는 날도 빈 칸으로 채워 간격이 왜곡되지 않게 한다.
  const byDay = new Map<string, { class: number; public: number }>();
  for (const r of rows) {
    const day = r.at.slice(0, 10);
    const bucket = byDay.get(day) ?? { class: 0, public: 0 };
    bucket[r.cohort] = (bucket[r.cohort] ?? 0) + 1;
    byDay.set(day, bucket);
  }

  const days = [...byDay.keys()].sort();
  const daily: Stats["daily"] = [];
  if (days.length) {
    const cursor = new Date(days[0]);
    const last = new Date(days[days.length - 1]);
    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      const b = byDay.get(key) ?? { class: 0, public: 0 };
      daily.push({ date: key, class: b.class, public: b.public });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const sentenceLearners = new Map<string, Set<string>>();
  for (const r of analyses) {
    if (!r.sentence) continue;
    const set = sentenceLearners.get(r.sentence) ?? new Set<string>();
    set.add(r.subject);
    sentenceLearners.set(r.sentence, set);
  }

  const rates = rows
    .map((r) => Number(r.detail?.rate))
    .filter((n) => Number.isFinite(n));

  return {
    total: rows.length,
    learners: new Set(rows.map((r) => r.subject)).size,
    analyses: analyses.length,
    byCohort: {
      class: rows.filter((r) => r.cohort === "class").length,
      public: rows.filter((r) => r.cohort === "public").length,
    },
    daily,
    topSentences: topBy(analyses, (r) => r.sentence, 8).map((s) => ({
      sentence: s.value,
      count: s.count,
      learners: sentenceLearners.get(s.value)?.size ?? 0,
    })),
    topChunks: topBy(
      rows.filter((r) => r.event === "play_chunk" || r.event === "play_collocation"),
      (r) => (typeof r.detail?.text === "string" ? r.detail.text : null),
      8,
    ).map((c) => ({ text: c.value, count: c.count })),
    avgRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
  };
}
