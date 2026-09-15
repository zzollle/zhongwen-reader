import table from "@/data/hsk-levels.json";

type Entry = [newLevel: number, oldLevel: number, pinyin: string];

const levels = table as unknown as Record<string, Entry>;

/** 신HSK(3.0) 급수. 0이면 등급 밖 */
export function hskNew(word: string): number {
  return levels[word]?.[0] ?? 0;
}

/** 구HSK(2.0) 급수. 0이면 등급 밖 */
export function hskOld(word: string): number {
  return levels[word]?.[1] ?? 0;
}

/**
 * 학습자가 이미 안다고 보는 급수 이하의 단어인지 판정한다.
 *
 * 신HSK(3.0)는 구HSK(2.0)보다 어휘를 낮은 급수에 배치한다 — 面临·机遇는
 * 신4급이지만 구5~6급이다. 낮은 쪽을 따르면 정작 짚어야 할 단어가 빠지므로,
 * 등급이 매겨진 체계들의 최댓값을 기준으로 삼는다.
 */
export function isKnown(word: string, threshold: number): boolean {
  const graded = [hskNew(word), hskOld(word)].filter((l) => l > 0);
  if (!graded.length) return false;
  return Math.max(...graded) <= threshold;
}
