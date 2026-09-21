"use client";

import { useState } from "react";

export default function PasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/dashboard-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) location.reload();
    else {
      setError("비밀번호가 맞지 않습니다.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-lg font-semibold">사용 기록</h1>
      <p className="mt-1 text-sm text-muted">교수자용 화면입니다.</p>

      <form onSubmit={submit} className="mt-5 flex gap-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 placeholder:text-faint"
        />
        <button
          disabled={busy || !password}
          className="rounded-md bg-accent px-4 py-2 text-sm text-paper disabled:opacity-40"
        >
          열기
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </main>
  );
}
