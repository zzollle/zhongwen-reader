"use client";

import { useSyncExternalStore } from "react";

/**
 * 학습 기록. IRB 승인 전까지는 NEXT_PUBLIC_LOGGING_ENABLED가 꺼져 있어
 * 동의 화면도 뜨지 않고 식별자도 만들어지지 않는다.
 */
export const LOGGING_AVAILABLE = process.env.NEXT_PUBLIC_LOGGING_ENABLED === "true";

const SUBJECT_KEY = "study_subject";
const CONSENT_KEY = "study_consent";
const CODE_KEY = "study_class_code";

export type Consent = "unset" | "granted" | "denied";

export type EventName =
  | "analyze"
  | "play_all"
  | "play_by_chunk"
  | "play_chunk"
  | "play_word"
  | "play_collocation";

let listeners: (() => void)[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 시크릿 창 등에서 저장이 막히면 이번 세션에만 적용된다
  }
}

export function getConsent(): Consent {
  const stored = read(CONSENT_KEY);
  return stored === "granted" || stored === "denied" ? stored : "unset";
}

export function setConsent(consent: Exclude<Consent, "unset">) {
  write(CONSENT_KEY, consent);
  if (consent === "denied") {
    // 거부하면 이미 만들어진 식별자도 지운다
    try {
      localStorage.removeItem(SUBJECT_KEY);
    } catch {}
  }
  emit();
}

export function getClassCode(): string {
  return read(CODE_KEY) ?? "";
}

export function setClassCode(code: string) {
  write(CODE_KEY, code.trim());
  emit();
}

/** 동의한 경우에만 가명 식별자를 만든다. 거부 상태면 아예 생성하지 않는다. */
function subjectId(): string | null {
  if (getConsent() !== "granted") return null;
  const existing = read(SUBJECT_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  write(SUBJECT_KEY, fresh);
  return fresh;
}

export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, getConsent, () => "unset" as const);
}

/**
 * 기록을 보낸다. 실패해도 조용히 넘어간다 — 학습을 방해하지 않는 것이 기록보다 중요하다.
 */
export function logEvent(event: EventName, detail?: Record<string, unknown>) {
  if (!LOGGING_AVAILABLE) return;

  const subject = subjectId();
  if (!subject) return;

  const body = JSON.stringify({
    subject,
    code: getClassCode() || undefined,
    event,
    sentence: typeof detail?.sentence === "string" ? detail.sentence : undefined,
    detail,
  });

  // 페이지를 떠나는 중에도 전송되도록 sendBeacon을 먼저 쓴다
  try {
    if (navigator.sendBeacon?.(("/api/log"), new Blob([body], { type: "application/json" })))
      return;
  } catch {}

  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
