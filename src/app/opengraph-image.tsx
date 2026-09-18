import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "미디어 중국어 독해와 낭독 연습";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 한글·중국어는 기본 폰트에 없어 두부(□)로 깨진다. 쓰는 글자만 담은 서브셋을 싣는다.
const notoKr = await readFile(join(process.cwd(), "assets/fonts/noto-kr.ttf"));
const notoSc = await readFile(join(process.cwd(), "assets/fonts/noto-sc.ttf"));

const PAPER = "#2a1c15";
const INK = "#f7f0ea";
const MUTED = "#cdbbad";
const ACCENT = "#f0a868";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PAPER,
          backgroundImage: `radial-gradient(900px 560px at 50% 0%, #46301f, ${PAPER} 72%)`,
        }}
      >
        {/* 앱 아이콘과 같은 표식 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 112,
            height: 112,
            marginBottom: 32,
            borderRadius: 28,
            border: `3px solid ${ACCENT}`,
            fontSize: 72,
            fontFamily: "NotoSC",
            color: ACCENT,
            lineHeight: 1,
          }}
        >
          读
        </div>

        {/* 한 줄로는 카드 폭을 넘는다. 제멋대로 줄바꿈되지 않게 의미 단위로 나눈다 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 84,
            lineHeight: 1.2,
            fontFamily: "NotoKR",
            color: INK,
            letterSpacing: -2,
          }}
        >
          <div>미디어 중국어</div>
          <div>독해와 낭독 연습</div>
        </div>

        <div
          style={{
            marginTop: 28,
            width: 120,
            height: 5,
            borderRadius: 999,
            backgroundColor: ACCENT,
          }}
        />

        <div
          style={{
            marginTop: 30,
            fontSize: 38,
            fontFamily: "NotoKR",
            color: MUTED,
          }}
        >
          해석 · 문장 구조 · 새 단어 · 의미 단위 끊어 읽기
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "NotoKR", data: notoKr, style: "normal", weight: 700 },
        { name: "NotoSC", data: notoSc, style: "normal", weight: 700 },
      ],
    },
  );
}
