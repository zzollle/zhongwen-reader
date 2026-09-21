import DailyChart from "@/components/DailyChart";
import PasswordForm from "@/components/PasswordForm";
import { dashboardPassword, isSignedIn } from "@/lib/dashboard-auth";
import { fetchRows, summarize } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "사용 기록", robots: { index: false } };

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-xs text-faint">{note}</div>}
    </div>
  );
}

export default async function Dashboard() {
  if (!dashboardPassword()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
          대시보드 비밀번호가 설정되지 않아 열 수 없습니다.
        </p>
      </main>
    );
  }

  if (!(await isSignedIn())) return <PasswordForm />;

  const rows = await fetchRows();
  if (!rows) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="rounded-lg border border-line bg-surface p-5 text-sm text-danger">
          기록을 불러오지 못했습니다. Supabase 설정을 확인해 주세요.
        </p>
      </main>
    );
  }

  const s = summarize(rows);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold">사용 기록</h1>
        <p className="mt-1 text-sm text-muted">
          미디어 중국어 독해와 낭독 연습 · 동의한 이용자의 가명 기록입니다.
        </p>
      </header>

      {s.total === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
          아직 쌓인 기록이 없습니다. 학생들이 동의하고 사용하면 여기에 나타납니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="이용자" value={`${s.learners}명`} note="가명 기준" />
            <Tile label="분석한 문장" value={`${s.analyses}건`} />
            <Tile
              label="수강생 / 외부"
              value={`${s.byCohort.class} / ${s.byCohort.public}`}
              note="전체 활동"
            />
            <Tile
              label="평균 재생 속도"
              value={s.avgRate ? `${s.avgRate.toFixed(2)}배` : "—"}
              note="느릴수록 어려워함"
            />
          </div>

          <DailyChart daily={s.daily} />

          <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-muted">
              자주 반복해 들은 덩어리
            </h2>
            <p className="mt-1 text-xs text-faint">여러 번 들었다는 건 그 대목에서 막혔다는 신호입니다.</p>
            {s.topChunks.length ? (
              <ul className="mt-3 space-y-2">
                {s.topChunks.map((c) => (
                  <li key={c.text} className="flex items-center gap-3">
                    <span className="han w-40 shrink-0 truncate text-base" title={c.text}>
                      {c.text}
                    </span>
                    <span
                      className="h-2.5 rounded bg-series-class"
                      style={{ width: `${(c.count / s.topChunks[0].count) * 60}%` }}
                    />
                    <span className="text-xs text-muted">{c.count}회</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-faint">아직 없습니다.</p>
            )}
          </section>

          <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-muted">
              많이 분석한 문장
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-faint">
                    <th className="pb-2 pr-4 font-normal">문장</th>
                    <th className="pb-2 pr-4 font-normal">분석 횟수</th>
                    <th className="pb-2 font-normal">사람 수</th>
                  </tr>
                </thead>
                <tbody>
                  {s.topSentences.map((t) => (
                    <tr key={t.sentence} className="border-b border-line align-top">
                      <td className="han py-2 pr-4">{t.sentence}</td>
                      <td className="py-2 pr-4 text-muted">{t.count}</td>
                      <td className="py-2 text-muted">{t.learners}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
