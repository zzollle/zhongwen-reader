"use client";

import { useEffect, useRef, useState } from "react";
import { makeUtterance, speak, useSpeechSupported, type VoiceOption } from "@/lib/speech";
import type { Chunk } from "@/lib/types";

type Props = {
  chunks: Chunk[];
  voiceOptions: VoiceOption[];
  voice: SpeechSynthesisVoice | undefined;
  voiceUri: string;
  onVoiceChange: (uri: string) => void;
  rate: number;
  onRateChange: (rate: number) => void;
};

export default function Playback({
  chunks,
  voiceOptions,
  voice,
  voiceUri,
  onVoiceChange,
  rate,
  onRateChange,
}: Props) {
  const [breakMs, setBreakMs] = useState(300);
  const [active, setActive] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = useSpeechSupported();
  const stopped = useRef(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  function stop() {
    stopped.current = true;
    window.speechSynthesis.cancel();
    setActive(null);
    setBusy(false);
  }

  async function run(fn: () => Promise<void>) {
    if (!voiceOptions.length) {
      setError("이 브라우저에 중국어 음성이 설치되어 있지 않습니다.");
      return;
    }
    stopped.current = false;
    setError(null);
    setBusy(true);
    window.speechSynthesis.cancel();
    try {
      await fn();
    } catch (e) {
      if (!stopped.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActive(null);
      setBusy(false);
    }
  }

  /** 덩어리를 한꺼번에 큐에 넣는다. 사이에 끊김이 가장 적다. */
  const playAll = () =>
    run(async () => {
      const last = chunks.length - 1;
      await new Promise<void>((resolve, reject) => {
        chunks.forEach((chunk, i) => {
          const u = makeUtterance(chunk.text, voice, rate);
          u.onstart = () => setActive(i);
          if (i === last) {
            u.onend = () => resolve();
            u.onerror = (e) => {
              if (e.error === "interrupted" || e.error === "canceled") resolve();
              else reject(new Error("음성 재생에 실패했습니다."));
            };
          }
          window.speechSynthesis.speak(u);
        });
      });
    });

  const playOne = (i: number) =>
    run(async () => {
      setActive(i);
      await speak(makeUtterance(chunks[i].text, voice, rate));
    });

  const playByChunk = () =>
    run(async () => {
      for (let i = 0; i < chunks.length; i++) {
        if (stopped.current) return;
        setActive(i);
        await speak(makeUtterance(chunks[i].text, voice, rate));
        if (stopped.current) return;
        await new Promise((r) => setTimeout(r, breakMs));
      }
    });

  if (!supported) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-muted">낭독</h2>
        <p className="mt-2 text-sm text-muted">
          이 브라우저는 음성 재생을 지원하지 않습니다. Chrome이나 Safari에서 열어 주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold tracking-wide text-muted">
          낭독
        </h2>
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
          <span className="mt-0.5 block text-xs text-faint">
            &lsquo;한 덩어리씩&rsquo;에만 적용
          </span>
        </label>
        <label className="text-sm">
          <span className="text-muted">목소리</span>
          <select
            value={voiceUri}
            onChange={(e) => onVoiceChange(e.target.value)}
            disabled={!voiceOptions.length}
            className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 disabled:text-faint"
          >
            {voiceOptions.length ? (
              voiceOptions.map((o) => (
                <option key={o.voice.voiceURI} value={o.voice.voiceURI}>
                  {o.label}
                </option>
              ))
            ) : (
              <option>중국어 음성 없음</option>
            )}
          </select>
          <span className="mt-0.5 block text-xs text-faint">새 단어에도 함께 적용</span>
        </label>
      </div>

      {!voiceOptions.length && (
        <p className="mt-3 text-sm text-muted">
          중국어 음성이 없습니다. macOS는 시스템 설정 → 손쉬운 사용 → 라이브 말하기(음성 콘텐츠)에서
          중국어 음성을 내려받으면 목록에 나타납니다.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
