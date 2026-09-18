"use client";

import { useEffect, useState } from "react";
import { logEvent } from "@/lib/logging";
import {
  VOICE_OPTIONS,
  isCurrent,
  speakChunks,
  startSpeech,
  stopSpeech,
  wait,
  type Gender,
} from "@/lib/tts";
import type { Chunk } from "@/lib/types";

type Props = {
  chunks: Chunk[];
  gender: Gender;
  onGenderChange: (gender: Gender) => void;
  rate: number;
  onRateChange: (rate: number) => void;
};

export default function Playback({ chunks, gender, onGenderChange, rate, onRateChange }: Props) {
  const [breakMs, setBreakMs] = useState(300);
  const [active, setActive] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => stopSpeech(), []);

  async function run(fn: (gen: number) => Promise<void>) {
    const gen = startSpeech();
    setError(null);
    setBusy(true);
    try {
      await fn(gen);
    } catch (e) {
      if (isCurrent(gen)) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActive(null);
      setBusy(false);
    }
  }

  const texts = chunks.map((c) => c.text);

  const playAll = () =>
    run(async (gen) => {
      logEvent("play_all", { rate, breakMs, voice: gender, chunks: chunks.length });
      await speakChunks(gen, texts, { gender, rate, breakMs }, setActive);
    });

  const playOne = (i: number) =>
    run(async (gen) => {
      logEvent("play_chunk", { rate, voice: gender, index: i, text: texts[i] });
      setActive(i);
      await speakChunks(gen, [texts[i]], { gender, rate, breakMs: 0 });
    });

  const playByChunk = () =>
    run(async (gen) => {
      logEvent("play_by_chunk", { rate, breakMs, voice: gender, chunks: chunks.length });
      for (let i = 0; i < texts.length; i++) {
        if (!isCurrent(gen)) return;
        setActive(i);
        await speakChunks(gen, [texts[i]], { gender, rate, breakMs: 0 });
        if (!isCurrent(gen)) return;
        await wait(breakMs);
      }
    });

  function stop() {
    stopSpeech();
    setActive(null);
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold tracking-wide text-muted">낭독</h2>
        <button
          onClick={playAll}
          disabled={busy}
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-40"
        >
          전체 재생
        </button>
        <button
          onClick={playByChunk}
          disabled={busy}
          className="rounded-md border border-line px-3 py-1.5 text-sm disabled:opacity-40"
        >
          한 덩어리씩
        </button>
        <button
          onClick={stop}
          disabled={!busy}
          className="rounded-md border border-line px-3 py-1.5 text-sm disabled:opacity-40"
        >
          정지
        </button>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-4">
        {chunks.map((chunk, i) => (
          <button
            key={i}
            onClick={() => playOne(i)}
            disabled={busy && active !== i}
            title={chunk.collocation ? `搭配: ${chunk.collocation}` : undefined}
            className={`group rounded-md px-2 py-1.5 text-left transition-colors ${
              active === i ? "bg-highlight" : "hover:bg-paper"
            }`}
          >
            <div className="text-xs text-faint">{chunk.pinyin}</div>
            <div className="han text-2xl leading-snug sm:text-3xl">{chunk.text}</div>
            <div className="mt-0.5 text-xs text-muted">{chunk.meaning}</div>
            {chunk.collocation && (
              <div className="han mt-1 inline-block rounded bg-paper px-1.5 py-0.5 text-xs text-accent group-hover:bg-surface">
                {chunk.collocation}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-muted">속도 {rate.toFixed(1)}배</span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={rate}
            onChange={(e) => onRateChange(Number(e.target.value))}
            className="mt-1 w-full accent-accent"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">덩어리 사이 쉼 {breakMs}ms</span>
          <input
            type="range"
            min={0}
            max={1500}
            step={100}
            value={breakMs}
            onChange={(e) => setBreakMs(Number(e.target.value))}
            className="mt-1 w-full accent-accent"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">목소리</span>
          <select
            value={gender}
            onChange={(e) => onGenderChange(e.target.value as Gender)}
            className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5"
          >
            {VOICE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="mt-0.5 block text-xs text-faint">새 단어에도 함께 적용</span>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
