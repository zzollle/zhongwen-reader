import type { Stats } from "@/lib/stats";

/**
 * 날짜별 사용량. 수강생과 외부를 더하면 그날 전체가 되므로 누적 막대로 쌓는다.
 * 색만으로 구분되지 않도록 범례를 항상 두고, 값은 툴팁과 아래 표로도 읽을 수 있다.
 */
export default function DailyChart({ daily }: { daily: Stats["daily"] }) {
  if (!daily.length) return null;

  const max = Math.max(...daily.map((d) => d.class + d.public), 1);
  const recent = daily.slice(-30);

  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="mr-auto text-sm font-semibold tracking-wide text-muted">
          날짜별 사용량
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-2.5 rounded-sm bg-series-class" />
          수강생
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-2.5 rounded-sm bg-series-public" />
          외부
        </span>
      </div>

      <div className="mt-5 flex h-44 items-end gap-1 sm:gap-1.5">
        {recent.map((d) => {
          const total = d.class + d.public;
          return (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 flex-col justify-end"
              title={`${d.date.slice(5)} · 수강생 ${d.class} · 외부 ${d.public}`}
            >
              {d.public > 0 && (
                <div
                  className="w-full rounded-t bg-series-public"
                  style={{ height: `${(d.public / max) * 100}%` }}
                />
              )}
              {d.class > 0 && (
                <div
                  // 두 계열 사이에 2px 틈을 둬서 경계가 붙어 보이지 않게 한다
                  className={`w-full bg-series-class ${d.public > 0 ? "mt-0.5 rounded-b" : "rounded"}`}
                  style={{ height: `${(d.class / max) * 100}%` }}
                />
              )}
              {total === 0 && <div className="h-px w-full bg-line" />}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-xs text-faint">
        <span>{recent[0]?.date.slice(5)}</span>
        <span>최대 {max}건</span>
        <span>{recent[recent.length - 1]?.date.slice(5)}</span>
      </div>
    </section>
  );
}
