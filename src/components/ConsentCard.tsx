"use client";

import { useState } from "react";
import {
  LOGGING_AVAILABLE,
  getClassCode,
  setClassCode,
  setConsent,
  useConsent,
} from "@/lib/logging";

export default function ConsentCard() {
  const consent = useConsent();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);

  if (!LOGGING_AVAILABLE || consent !== "unset") return null;

  function agree() {
    setClassCode(code);
    setConsent("granted");
  }

  return (
    <section className="mb-8 rounded-lg border border-line bg-surface p-5 text-sm sm:p-6">
      <h2 className="font-semibold">학습 기록 수집에 관한 안내</h2>

      <p className="mt-2 text-muted">
        수업과 앱을 개선하기 위해 학습 기록을 모으고 있습니다. 입력한 문장, 사용 시각,
        낭독 재생 기록이 대상이며{" "}
        <strong className="text-ink">이름·학번·이메일은 수집하지 않습니다.</strong>
      </p>

      <p className="mt-2 text-muted">
        동의하지 않아도 <strong className="text-ink">모든 기능을 똑같이 사용</strong>할 수
        있고, 성적과는 아무 관련이 없습니다. 누가 동의했는지는 담당 교수도 알 수 없습니다.
      </p>

      {open && (
        <div className="mt-4 rounded-md border border-line bg-paper p-4 text-muted">
          <p>
            기록은 브라우저가 만든 무작위 번호에만 묶입니다. 그 번호가 누구의 것인지
            확인할 방법이 없어, 나중에 특정인의 기록만 골라 지우는 것은 어렵습니다.
          </p>
          <p className="mt-2">
            모은 기록은 수업 운영과 앱 개선에만 씁니다.{" "}
            <strong className="text-ink">연구나 외부 발표에는 사용하지 않습니다.</strong>{" "}
            학기가 끝나면 파기하며, 설정은 언제든 아래 버튼으로 다시 바꿀 수 있습니다.
          </p>
        </div>
      )}

      <label className="mt-4 block">
        <span className="text-muted">수업 코드 (수강생만, 없으면 비워 두세요)</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="선택 입력"
          className="mt-1 w-full max-w-xs rounded-md border border-line bg-paper px-3 py-2 placeholder:text-faint"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={agree}
          className="rounded-md bg-accent px-4 py-2 text-paper"
        >
          동의합니다
        </button>
        <button
          onClick={() => setConsent("denied")}
          className="rounded-md border border-line px-4 py-2"
        >
          동의하지 않습니다
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-faint underline underline-offset-4"
        >
          {open ? "접기" : "자세히"}
        </button>
      </div>
    </section>
  );
}

/** 동의 여부를 정한 뒤에도 언제든 바꿀 수 있는 자리. 철회할 권리를 지키기 위한 것. */
export function LoggingSettings() {
  const consent = useConsent();
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState("");

  if (!LOGGING_AVAILABLE || consent === "unset") return null;

  if (!editing) {
    return (
      <p className="mt-10 text-center text-xs text-faint">
        학습 기록 {consent === "granted" ? "수집 중" : "수집하지 않음"} ·{" "}
        <button
          onClick={() => {
            setCode(getClassCode());
            setEditing(true);
          }}
          className="underline underline-offset-4"
        >
          변경
        </button>
      </p>
    );
  }

  return (
    <section className="mt-10 rounded-lg border border-line bg-surface p-5 text-sm">
      <h2 className="font-semibold">학습 기록 설정</h2>

      <label className="mt-3 block">
        <span className="text-muted">수업 코드</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="수강생만 입력"
          className="mt-1 w-full max-w-xs rounded-md border border-line bg-paper px-3 py-2 placeholder:text-faint"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setClassCode(code);
            setConsent("granted");
            setEditing(false);
          }}
          className="rounded-md bg-accent px-4 py-2 text-paper"
        >
          기록에 동의
        </button>
        <button
          onClick={() => {
            setConsent("denied");
            setEditing(false);
          }}
          className="rounded-md border border-line px-4 py-2"
        >
          기록 중단
        </button>
        <button
          onClick={() => setEditing(false)}
          className="ml-auto text-faint underline underline-offset-4"
        >
          닫기
        </button>
      </div>

      <p className="mt-3 text-xs text-faint">
        중단해도 이미 수집된 기록은 누구의 것인지 구별할 수 없어 개별 삭제가 어렵습니다.
      </p>
    </section>
  );
}
