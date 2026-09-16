/**
 * 분석 결과가 없을 때 보여주는 첫 화면.
 * 앱이 하는 일(문장을 의미 단위로 끊는 것)을 그대로 보여준다.
 */
const CHUNKS = [
  { han: "一句话，", pinyin: "yí jù huà", ko: "한 문장으로" },
  { han: "读懂", pinyin: "dú dǒng", ko: "읽어내다" },
  { han: "世界", pinyin: "shì jiè", ko: "세상을" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-lg border border-line bg-surface px-5 py-10 text-center sm:px-8 sm:py-12">
      <span
        aria-hidden
        className="han pointer-events-none absolute -right-4 -top-6 select-none text-[7rem] leading-none text-accent opacity-[0.07] sm:-right-6 sm:-top-8 sm:text-[10rem]"
      >
        读
      </span>

      <p className="relative text-xs tracking-widest text-faint">이렇게 끊어 읽습니다</p>

      <div className="relative mt-6 flex flex-wrap items-end justify-center gap-x-4 gap-y-6 sm:gap-x-7">
        {CHUNKS.map((chunk) => (
          <div key={chunk.han}>
            <div className="text-xs text-faint">{chunk.pinyin}</div>
            <div className="han mt-1 text-3xl leading-snug sm:text-4xl">{chunk.han}</div>

            {/* 한 호흡으로 읽는 덩어리라는 표시 */}
            <svg
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              aria-hidden
              className="mt-1.5 h-2 w-full text-accent"
            >
              <path
                d="M2 2 Q 50 9 98 2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.45"
              />
            </svg>

            <div className="mt-1.5 text-xs text-muted">{chunk.ko}</div>
          </div>
        ))}
      </div>

      <p className="relative mt-8 text-sm text-muted">
        위에 문장을 넣으면 해석과 문장 구조, 새 단어가 함께 나옵니다.
        <span className="mt-1 block text-faint">
          덩어리를 누르면 그 부분만 다시 들을 수 있습니다.
        </span>
      </p>
    </section>
  );
}
