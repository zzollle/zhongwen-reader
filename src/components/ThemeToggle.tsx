"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribe } from "@/lib/theme";

export default function ThemeToggle() {
  // 서버에서는 주간으로 그리고, 하이드레이션 후 실제 값으로 맞춘다.
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as const);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-pressed={isDark}
      title={isDark ? "주간 화면으로" : "야간 화면으로"}
      className="rounded-md border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface"
    >
      {isDark ? "주간" : "야간"}
    </button>
  );
}
