export type Chunk = {
  text: string;
  pinyin: string;
  meaning: string;
  /** 이 덩어리가 搭配(연어)로 묶인 이유. 없으면 단순 통사 단위 */
  collocation?: string;
};

export type StructurePart = {
  text: string;
  role: string;
  note?: string;
};

export type GrammarPoint = {
  point: string;
  explanation: string;
  example?: string;
};

export type VocabItem = {
  word: string;
  pinyin: string;
  meaning: string;
  usage?: string;
  collocations?: string[];
  hskNew: number;
  hskOld: number;
};

export type Analysis = {
  sentence: string;
  translation: string;
  translationNote?: string;
  pattern: string;
  parts: StructurePart[];
  grammarPoints: GrammarPoint[];
  chunks: Chunk[];
  vocabulary: VocabItem[];
};
