"use client";

/**
 * 낭독 재생. Azure 음성을 먼저 쓰고, 실패하면(무료 한도 초과 등) 브라우저 내장 음성으로
 * 대신 읽는다. 어떤 경우에도 소리는 나게 하는 것이 목표다.
 */

export type Gender = "female" | "male";

export const VOICE_OPTIONS: { id: Gender; label: string }[] = [
  { id: "female", label: "여성 · 샤오샤오 晓晓" },
  { id: "male", label: "남성 · 윈양 云扬" },
];

export type SpeakOptions = { gender: Gender; rate: number; breakMs: number };

// ── 재생 흐름 관리 ─────────────────────────────────────────────
// 새 재생이 시작되면 이전 재생은 멈추고, 이전 흐름(한 덩어리씩 등)은 더 진행하지 않는다.

let generation = 0;
let settle: (() => void) | null = null;
let audio: HTMLAudioElement | null = null;
let frame = 0;

function halt() {
  cancelAnimationFrame(frame);
  settle?.();
  settle = null;
  audio?.pause();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

/** 새 재생을 시작하고 그 흐름의 번호를 돌려준다. */
export function startSpeech(): number {
  halt();
  return ++generation;
}

export function stopSpeech() {
  halt();
  generation++;
}

export function isCurrent(gen: number): boolean {
  return gen === generation;
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Azure 음성 ────────────────────────────────────────────────

let serverDownUntil = 0;

function ttsUrl(chunks: string[], { gender, rate, breakMs }: SpeakOptions): string {
  const p = new URLSearchParams();
  for (const c of chunks) p.append("c", c);
  p.set("v", gender);
  // 같은 값이면 같은 주소가 되어야 CDN 캐시가 맞는다
  p.set("r", rate.toFixed(1));
  p.set("b", String(Math.round(breakMs)));
  return `/api/tts?${p}`;
}

/**
 * 각 덩어리가 오디오 몇 초에서 시작하는지 어림한다.
 * 중국어는 음절마다 길이가 비슷해 글자 수 비례로 꽤 맞는다. 구두점은 쉼이 생겨 조금 더 친다.
 */
function chunkStarts(chunks: string[], breakMs: number, duration: number): number[] {
  const weight = (s: string) =>
    [...s].reduce((w, ch) => w + (/[，。、；：？！,.;:?!]/.test(ch) ? 1.5 : 1), 0);
  const weights = chunks.map(weight);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const pause = breakMs / 1000;
  const speech = Math.max(0.1, duration - pause * (chunks.length - 1));

  const starts: number[] = [];
  let t = 0;
  for (const w of weights) {
    starts.push(t);
    t += (w / total) * speech + pause;
  }
  return starts;
}

function playServer(
  chunks: string[],
  opts: SpeakOptions,
  onChunk?: (index: number) => void,
): Promise<void> {
  audio ??= new Audio();
  const a = audio;

  return new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (err?: unknown) => {
      if (done) return;
      done = true;
      settle = null;
      cancelAnimationFrame(frame);
      a.onended = null;
      a.onerror = null;
      if (err) reject(err);
      else resolve();
    };

    settle = () => finish();
    a.onended = () => finish();
    a.onerror = () => finish(new Error("tts"));

    if (onChunk) {
      let last = -1;
      const tick = () => {
        if (done) return;
        if (Number.isFinite(a.duration) && a.duration > 0) {
          const starts = chunkStarts(chunks, opts.breakMs, a.duration);
          let i = 0;
          while (i + 1 < starts.length && a.currentTime >= starts[i + 1]) i++;
          if (i !== last) {
            last = i;
            onChunk(i);
          }
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    a.src = ttsUrl(chunks, opts);
    a.play().catch((e) => finish(e));
  });
}

// ── 브라우저 내장 음성 (대체용) ─────────────────────────────────

const FEMALE = [
  "Google 普通话",
  "Tingting",
  "Microsoft Huihui",
  "Microsoft Yaoyao",
  "Microsoft Xiaoxiao",
  "Shelley",
  "Sandy",
  "Flo",
  "Grandma",
];
const MALE = [
  "Microsoft Kangkang",
  "Microsoft Yunxi",
  "Microsoft Yunyang",
  "Eddy",
  "Reed",
  "Rocko",
  "Grandpa",
];

function browserVoice(gender: Gender): SpeechSynthesisVoice | undefined {
  const mainland = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("zh-cn"));
  const candidates = gender === "female" ? FEMALE : MALE;
  for (const name of candidates) {
    const hit = mainland.find((v) => v.name.toLowerCase().startsWith(name.toLowerCase()));
    if (hit) return hit;
  }
  return mainland[0];
}

function utter(text: string, voice: SpeechSynthesisVoice | undefined, rate: number) {
  return new Promise<void>((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "zh-CN";
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") resolve();
      else reject(new Error("음성 재생에 실패했습니다."));
    };
    window.speechSynthesis.speak(u);
  });
}

async function playBrowser(
  gen: number,
  chunks: string[],
  opts: SpeakOptions,
  onChunk?: (index: number) => void,
) {
  if (!window.speechSynthesis) throw new Error("이 브라우저는 음성 재생을 지원하지 않습니다.");
  const voice = browserVoice(opts.gender);
  for (let i = 0; i < chunks.length; i++) {
    if (!isCurrent(gen)) return;
    onChunk?.(i);
    await utter(chunks[i], voice, opts.rate);
    if (i < chunks.length - 1 && opts.breakMs > 0) await wait(opts.breakMs);
  }
}

// ── 공개 함수 ─────────────────────────────────────────────────

/**
 * 덩어리들을 한 번에 읽는다. Azure에서는 덩어리 사이에 <break>가 들어간 한 문장으로
 * 합성되어 억양이 자연스럽게 이어진다. onChunk로 지금 읽는 덩어리를 알려준다.
 */
export async function speakChunks(
  gen: number,
  chunks: string[],
  opts: SpeakOptions,
  onChunk?: (index: number) => void,
): Promise<void> {
  if (!isCurrent(gen) || !chunks.length) return;

  if (Date.now() >= serverDownUntil) {
    try {
      await playServer(chunks, opts, onChunk);
      return;
    } catch {
      if (!isCurrent(gen)) return;
      // 잠시 서버를 건너뛴다. 매번 실패를 기다리면 재생이 늦어진다.
      serverDownUntil = Date.now() + 60_000;
    }
  }

  await playBrowser(gen, chunks, opts, onChunk);
}
