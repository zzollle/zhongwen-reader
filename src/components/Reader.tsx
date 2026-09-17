"use client";

import { useState } from "react";
import ConsentCard, { LoggingSettings } from "./ConsentCard";
import Hero from "./Hero";
import Playback from "./Playback";
import Structure from "./Structure";
import ThemeToggle from "./ThemeToggle";
import Vocab from "./Vocab";
import sample from "@/data/sample.json";
import { MAX_CHARS } from "@/lib/limits";
import { logEvent } from "@/lib/logging";
import { useChineseVoices } from "@/lib/speech";
import type { Analysis } from "@/lib/types";

export default function Reader() {
  const [sentence, setSentence] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  // 낭독과 새 단어가 같은 목소리·속도를 쓰도록 여기서 들고 있는다.
  const voiceOptions = useChineseVoices();
  const [pickedVoice, setPickedVoice] = useState("");
  const [rate, setRate] = useState(0.9);
  const selected =
    voiceOptions.find((o) => o.voice.voiceURI === pickedVoice) ?? voiceOptions[0];
  const voice = selected?.voice;

  async function analyze(text: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: text }),
      });
      // 서버가 죽으면 JSON이 아니라 빈 응답이 온다. 그대로 파싱하면
      // 화면에 아무 것도 뜨지 않은 채 멈춘다.
      const raw = await res.text();
      let body: { error?: string; needCode?: boolean } & Analysis;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new Error(`서버 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`);
      }

      if (!res.ok) {
        if (body.needCode) setNeedCode(true);
        throw new Error(body.error ?? `분석에 실패했습니다 (${res.status}).`);
      }
      setAnalysis(body);
      logEvent("analyze", {
        sentence: text,
        chunks: body.chunks.length,
        vocabulary: body.vocabulary.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setNeedCode(false);
      setError(null);
    } else {
      setError("수업 코드가 맞지 않습니다.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-3 flex justify-end">
        <ThemeToggle />
      </div>

      <ConsentCard />

      {/* 공유 카드와 같은 인상을 주는 배너 */}
      <header className="banner mb-8 overflow-hidden rounded-lg border border-line px-5 py-10 text-center sm:px-8 sm:py-12">
        <div
          aria-hidden
          className="han mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border-2 border-accent text-4xl leading-none text-accent sm:size-20 sm:text-5xl"
        >
          读
        </div>

        <h1 className="text-2xl font-semibold sm:text-3xl">미디어 중국어 독해</h1>

        <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-accent" />

        <p className="mx-auto mt-4 max-w-md text-sm text-muted">
          중국어 문장을 넣으면 해석을 하고 구조를 분석합니다. 그리고 의미 단위로 끊어
          읽기합니다.
        </p>
      </header>

      {needCode ? (
        <form onSubmit={submitCode} className="mb-8 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="수업 코드"
            className="flex-1 rounded-md border border-line bg-surface px-3 py-2 placeholder:text-faint"
          />
          <button className="rounded-md bg-accent px-4 py-2 text-sm text-paper">
            확인
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (sentence.trim()) analyze(sentence.trim());
          }}
          className="mb-8"
        >
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            rows={3}
            maxLength={MAX_CHARS}
            placeholder="중국어 문장을 붙여 넣으세요"
            className="han w-full resize-y rounded-md border border-line bg-surface p-3 text-lg placeholder:text-faint"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              disabled={loading || !sentence.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm text-paper disabled:opacity-40"
            >
              {loading ? "분석 중…" : "분석하기"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSentence(sample.sentence);
                setAnalysis(sample as Analysis);
                setError(null);
              }}
              className="rounded-md border border-line px-4 py-2 text-sm"
            >
              예시 보기
            </button>
            <span className="ml-auto text-xs text-faint">
              {sentence.length}/{MAX_CHARS}
            </span>
          </div>
          {loading && (
            <p className="mt-2 text-sm text-muted">
              해석·구조·단어를 함께 분석하느라 20초쯤 걸립니다.
            </p>
          )}
        </form>
      )}

      {error && (
        <p className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!analysis && !loading && !needCode && <Hero />}

      {analysis && (
        <div className="space-y-5">
          <Playback
            chunks={analysis.chunks}
            voiceOptions={voiceOptions}
            voice={voice}
            voiceUri={voice?.voiceURI ?? ""}
            onVoiceChange={setPickedVoice}
            rate={rate}
            onRateChange={setRate}
          />

          <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-muted">해석</h2>
            <p className="mt-2 text-lg leading-relaxed">{analysis.translation}</p>
            {analysis.translationNote && (
              <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                {analysis.translationNote}
              </p>
            )}
          </section>

          <Structure analysis={analysis} />
          <Vocab
            items={analysis.vocabulary}
            voice={voice}
            rate={rate}
            canSpeak={voiceOptions.length > 0}
          />
        </div>
      )}

      <LoggingSettings />
    </main>
  );
}
