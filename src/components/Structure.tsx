import type { Analysis } from "@/lib/types";

export default function Structure({ analysis }: { analysis: Analysis }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-muted">문장 구조</h2>

      <p className="mt-2 text-base">{analysis.pattern}</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <tbody>
            {analysis.parts.map((part, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="han w-2/5 py-2 pr-4 text-lg">{part.text}</td>
                <td className="w-24 py-2 pr-4 text-muted">{part.role}</td>
                <td className="py-2 text-muted">{part.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {analysis.grammarPoints.length > 0 && (
        <div className="mt-6 space-y-4 border-t border-line pt-4">
          {analysis.grammarPoints.map((g, i) => (
            <div key={i}>
              <h3 className="han text-base font-semibold">{g.point}</h3>
              <p className="mt-1 text-sm text-muted">{g.explanation}</p>
              {g.example && (
                <p className="han mt-1.5 border-l-2 border-line pl-3 text-sm text-muted">
                  {g.example}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
