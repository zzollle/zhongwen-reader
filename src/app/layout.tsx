import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "미디어 중국어 독해",
  description:
    "중국어 문장을 넣으면 해석을 하고 구조를 분석합니다. 그리고 의미 단위로 끊어 읽기합니다.",
};

// React가 그리기 전에 테마를 적용해야 화면이 한 번 번쩍이지 않는다.
const applyTheme = `
try {
  var t = localStorage.getItem("theme");
  document.documentElement.dataset.theme = t === "dark" ? "dark" : "light";
} catch (e) {
  document.documentElement.dataset.theme = "light";
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyTheme }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
