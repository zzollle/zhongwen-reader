"use client";

import { useState } from "react";
import { makeUtterance, speak } from "@/lib/speech";
import type { VocabItem } from "@/lib/types";

function levelLabel(item: VocabItem): string {
  const parts: string[] = [];
  if (item.hskNew) parts.push(`신HSK ${item.hskNew}급`);
  if (item.hskOld) parts.push(`구HSK ${item.hskOld}급`);
  return parts.length ? parts.join(" · ") : "등급 밖";
}

type Props = {
  items: VocabItem[];
  voice: SpeechSynthesisVoice | undefined;
  rate: number;
  canSpeak: boolean;
};

export default function Vocab({ items, voice, rate, canSpeak }: Props) {
  const [speaking, setSpeaking] = useState<string | null>(null);

  async function say(text: string) {
    window.speechSynthesis.cancel();
    setSpeaking(text);
    try {
      await speak(makeUtterance(text, voice, rate));
    } finally {
      setSpeaking((current) => (current === text ? null : current));
    }
  }

  if (!items.length) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-muted">새 단어</h2>
        <p className="mt-2 text-sm text-muted">
          기준 급수를 넘는 새 단어가 없는 문장입니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-muted">
        새 단어 <span className="font-normal">({items.length})</span>
        {canSpeak && (
          <span className="ml-2 font-normal text-faint">단어나 搭配를 누르면 들립니다</span>
        )}
      </h2>

      <ul className="mt-3 divide-y divide-line">
        {items.map((item) => (
          <li key={item.word} className="py-3">
            <div className="flex flex-wrap items-baseline gap-x-3">
              {canSpeak ? (
                <button
                  onClick={() => say(item.word)}
                  className={`han rounded-md px-1.5 py-0.5 text-2xl transition-colors ${
                    speaking === item.word ? "bg-highlight" : "hover:bg-paper"
                  }`}
                >
                  {item.word}
                </button>
              ) : (
                <span className="han text-2xl">{item.word}</span>
              )}
              <span className="text-sm text-muted">{item.pinyin}</span>
              <span className="ml-auto text-xs text-faint">{levelLabel(item)}</span>
            </div>

            <p className="mt-1">{item.meaning}</p>
            {item.usage && <p className="mt-1 text-sm text-muted">{item.usage}</p>}

            {item.collocations && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.collocations.map((c) =>
                  canSpeak ? (
                    <button
                      key={c}
                      onClick={() => say(c)}
                      className={`han rounded px-2 py-0.5 text-sm text-accent transition-colors ${
                        speaking === c ? "bg-highlight" : "bg-paper hover:bg-line"
                      }`}
                    >
                      {c}
                    </button>
                  ) : (
                    <span
                      key={c}
                      className="han rounded bg-paper px-2 py-0.5 text-sm text-accent"
                    >
                      {c}
                    </span>
                  ),
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
