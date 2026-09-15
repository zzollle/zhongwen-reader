"use client";

export type Theme = "light" | "dark";

export const THEME_KEY = "theme";

/**
 * 테마는 <html data-theme>에 들어 있다.
 * 깜빡임을 막으려고 layout.tsx의 인라인 스크립트가 React보다 먼저 값을 넣는다.
 */
let listeners: (() => void)[] = [];

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 시크릿 창 등에서 저장이 막혀도 이번 세션 동안은 적용된다
  }
  emit();
}
