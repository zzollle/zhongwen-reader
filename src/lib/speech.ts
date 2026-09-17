"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function normalizeLang(voice: SpeechSynthesisVoice): string {
  return voice.lang.replace("_", "-").toLowerCase();
}

/** 시사 독해는 본토 기준이다. 대만·홍콩 음성은 목록에 올리지 않는다. */
function isMainland(voice: SpeechSynthesisVoice): boolean {
  return normalizeLang(voice).startsWith("zh-cn");
}

/**
 * 윈도우와 맥에 공통으로 존재하는 음성 이름은 없다. OS마다 후보를 나열해두고
 * 그 기기에서 찾아지는 첫 번째를 쓴다. 앞쪽일수록 품질이 좋은 순서다.
 *
 * Google 普通话는 Chrome이 OS와 무관하게 제공하므로 맨 앞에 둔다 —
 * 크롬을 쓰는 한 윈도우와 맥에서 같은 목소리가 난다.
 */
const FEMALE = [
  "Google 普通话",
  "Tingting", // macOS
  "Microsoft Huihui", // Windows 10
  "Microsoft Yaoyao",
  "Microsoft Xiaoxiao", // Windows 11 / Edge
  "Shelley", // macOS 캐릭터 음성 — 기기에 따라 없을 수 있다
  "Sandy",
  "Flo",
  "Grandma",
];

const MALE = [
  "Microsoft Kangkang", // Windows 10
  "Microsoft Yunxi", // Windows 11 / Edge
  "Microsoft Yunyang",
  "Eddy", // macOS — 본토 전용 남성 음성이 없어 캐릭터 음성을 쓴다
  "Reed",
  "Rocko",
  "Grandpa",
];

/** "Eddy (중국어(중국 본토))" → "Eddy" */
function shortName(voice: SpeechSynthesisVoice): string {
  return voice.name.split(" (")[0].trim();
}

function firstMatch(
  voices: SpeechSynthesisVoice[],
  candidates: string[],
): SpeechSynthesisVoice | undefined {
  for (const candidate of candidates) {
    const hit = voices.find((v) =>
      v.name.toLowerCase().startsWith(candidate.toLowerCase()),
    );
    if (hit) return hit;
  }
  return undefined;
}

export type VoiceOption = { voice: SpeechSynthesisVoice; label: string };

/** 서버 렌더에서는 지원한다고 보고, 클라이언트에서 실제 값으로 정정한다. */
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof window !== "undefined" && !!window.speechSynthesis,
    () => true,
  );
}

/** 본토 음성 중 여성·남성 하나씩. 기기에 없으면 그 자리는 비워 둔다. */
export function useChineseVoices(): VoiceOption[] {
  const [options, setOptions] = useState<VoiceOption[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // 음성 목록은 비동기로 채워진다. 첫 호출에서 비어 있으면 voiceschanged를 기다려야 한다.
    const load = () => {
      const mainland = window.speechSynthesis.getVoices().filter(isMainland);
      const female = firstMatch(mainland, FEMALE);
      const male = firstMatch(mainland, MALE);

      const picked: VoiceOption[] = [];
      if (female) picked.push({ voice: female, label: `여성 · ${shortName(female)}` });
      if (male) picked.push({ voice: male, label: `남성 · ${shortName(male)}` });

      // 기기마다 설치된 음성이 달라 한쪽만 잡히는 일이 잦다. 그럴 때는 남은
      // 본토 음성으로 자리를 채우되, 성별을 단정하지 않고 이름만 보여준다.
      for (const voice of mainland) {
        if (picked.length >= 2) break;
        if (picked.some((p) => p.voice.voiceURI === voice.voiceURI)) continue;
        picked.push({ voice, label: shortName(voice) });
      }

      setOptions(picked);
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  return options;
}

export function makeUtterance(
  text: string,
  voice: SpeechSynthesisVoice | undefined,
  rate: number,
): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "zh-CN";
  u.rate = rate;
  return u;
}

/** 재생이 끝나면 resolve. 정지로 끊긴 경우도 정상 종료로 본다. */
export function speak(u: SpeechSynthesisUtterance): Promise<void> {
  return new Promise((resolve, reject) => {
    u.onend = () => resolve();
    u.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") resolve();
      else reject(new Error("음성 재생에 실패했습니다."));
    };
    window.speechSynthesis.speak(u);
  });
}
