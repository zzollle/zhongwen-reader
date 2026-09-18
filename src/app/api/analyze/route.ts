import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import { hskNew, hskOld, isKnown } from "@/lib/hsk";
import { requireClassAccess } from "@/lib/access";
import { MAX_CHARS } from "@/lib/limits";
import type { Analysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const AnalysisSchema = z.object({
  translation: z.string().describe("문장 전체의 자연스러운 한국어 해석"),
  translationNote: z
    .string()
    .describe(
      "직역과 의역이 갈리는 지점, 또는 번역에서 놓치기 쉬운 뉘앙스. 특별할 게 없으면 빈 문자열",
    ),
  pattern: z
    .string()
    .describe(
      "문장 전체의 골격을 한 줄로. 예: '주어 + 把자문 + 결과보어' 또는 '겸어문(사역) + 개사구 상황어'",
    ),
  parts: z
    .array(
      z.object({
        text: z.string().describe("원문에서 그대로 잘라낸 구간"),
        role: z
          .string()
          .describe("문장성분. 예: 주어, 술어, 목적어, 관형어, 상황어, 보어"),
        note: z.string().describe("이 성분에 대한 짧은 설명. 없으면 빈 문자열"),
      }),
    )
    .describe("문장을 성분 단위로 빠짐없이 분해. 이어붙이면 원문이 되어야 한다"),
  grammarPoints: z
    .array(
      z.object({
        point: z.string().describe("문법 항목 이름"),
        explanation: z.string().describe("이 문장에서 어떻게 쓰였는지"),
        example: z.string().describe("같은 문법의 다른 예문. 없으면 빈 문자열"),
      }),
    )
    .describe("이 문장에서 짚고 넘어갈 문법 포인트. 없으면 빈 배열"),
  chunks: z
    .array(
      z.object({
        text: z.string().describe("원문에서 그대로 잘라낸 구간"),
        pinyin: z.string().describe("이 구간의 병음. 성조 부호 포함"),
        meaning: z.string().describe("이 구간의 한국어 뜻"),
        collocation: z
          .string()
          .describe(
            "이 구간이 搭配(연어)로 묶이는 경우 그 搭配를 적는다. 예: '发挥作用'. 단순 통사 단위면 빈 문자열",
          ),
      }),
    )
    .describe(
      "낭독용 분절. 搭配와 의미 단위를 깨뜨리지 않는 선에서 끊는다. 이어붙이면 원문이 되어야 한다",
    ),
  vocabulary: z
    .array(
      z.object({
        word: z.string().describe("단어. 간체자"),
        pinyin: z.string().describe("병음. 성조 부호 포함"),
        meaning: z.string().describe("이 문장 안에서의 한국어 뜻"),
        usage: z
          .string()
          .describe("품사와 용법에 대한 짧은 설명. 없으면 빈 문자열"),
        collocations: z
          .array(z.string())
          .describe("이 단어가 자주 이루는 搭配 2~3개. 없으면 빈 배열"),
      }),
    )
    .describe("문장에 나온 단어 중 중급 이상 학습자가 새로 익힐 만한 것"),
});

const SYSTEM = `당신은 한국 대학 중어중문학과의 시사 중국어 독해 수업을 돕는 교수 조교입니다.
학생들은 중급 이상이며, 신문·사설·논평 수준의 문장을 읽고 낭독하는 훈련을 합니다.

원칙:
- 해석은 직역투를 피하고 한국어로 자연스럽게. 단, 원문의 논조와 격식 수준은 유지한다.
- 문장성분 분해(parts)와 낭독 분절(chunks)은 각각 이어붙였을 때 원문과 정확히 일치해야 한다. 글자를 빠뜨리거나 더하지 말 것. 구두점도 원문 그대로 포함한다.
- chunks는 낭독 호흡 단위다. 搭配(연어)와 고정 구조를 절대 가운데서 쪼개지 않는다. 한 덩어리는 대략 2~7자가 적당하다.
- 단어 설명은 사전적 나열이 아니라 이 문장에서의 쓰임을 중심으로. 시사 텍스트에서 반복되는 搭配를 특히 짚어준다.
- 병음은 성조 부호(ā á ǎ à)로 표기한다. 숫자 성조를 쓰지 않는다.
- 一, 不 의 성조 변화는 실제 발음대로 표기한다.`;

const cache = new Map<string, Analysis>();

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (error) {
    // 핸들러 어디서 터지든 JSON으로 돌려준다. 그대로 던지면 배포 환경에서
    // 본문이 빈 500이 나가 원인을 알 수 없다.
    console.error("분석 실패", error);
    return NextResponse.json(
      {
        error: `예상치 못한 오류: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
}

async function handle(req: Request) {
  const denied = await requireClassAccess();
  if (denied) return denied;

  const { sentence } = await req.json();

  if (typeof sentence !== "string" || !sentence.trim()) {
    return NextResponse.json({ error: "문장을 입력해 주세요." }, { status: 400 });
  }
  if (sentence.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `한 번에 ${MAX_CHARS}자까지 분석할 수 있습니다. 문장을 나눠서 넣어 주세요.` },
      { status: 400 },
    );
  }
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  // 키를 붙여넣을 때 안내 문구나 줄바꿈이 딸려 오는 일이 잦다. 그대로 두면
  // HTTP 헤더를 만들 때 터지면서 원인을 알 수 없는 오류가 난다.
  // 무엇이 섞였는지 짚어주되 키 자체는 드러내지 않는다.
  const badIndex = [...apiKey].findIndex((c) => c.charCodeAt(0) < 33 || c.charCodeAt(0) > 126);
  if (badIndex >= 0) {
    const bad = apiKey[badIndex];
    const code = bad.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
    return NextResponse.json(
      {
        error:
          `ANTHROPIC_API_KEY에 키가 아닌 문자가 섞여 있습니다. ` +
          `전체 ${apiKey.length}자 중 ${badIndex + 1}번째가 '${bad}'(U+${code})입니다. ` +
          `정상적인 키는 108자이고 sk-ant-api03-로 시작합니다.`,
      },
      { status: 503 },
    );
  }

  // Anthropic 키는 모두 sk-ant-로 시작한다. 다른 서비스의 키(예: Azure)가 잘못된 칸에
  // 들어가면 인증 실패만 뜨고 이유를 알 수 없으므로 여기서 먼저 짚는다.
  if (!apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      {
        error:
          `ANTHROPIC_API_KEY에 Anthropic 키가 아닌 값(${apiKey.length}자)이 들어 있습니다. ` +
          `Anthropic 키는 sk-ant-로 시작하는 108자입니다. 다른 서비스의 키를 넣지 않았는지 확인해 주세요.`,
      },
      { status: 503 },
    );
  }

  const text = sentence.trim();
  const threshold = Number(process.env.KNOWN_HSK_LEVEL ?? 4);
  const key = `${threshold}:${text}`;

  const hit = cache.get(key);
  if (hit) return NextResponse.json(hit);

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(AnalysisSchema),
      },
      messages: [{ role: "user", content: text }],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json(
        { error: "분석 결과를 읽지 못했습니다. 다시 시도해 주세요." },
        { status: 502 },
      );
    }

    const analysis: Analysis = {
      sentence: text,
      translation: parsed.translation,
      translationNote: parsed.translationNote || undefined,
      pattern: parsed.pattern,
      parts: parsed.parts.map((p) => ({
        text: p.text,
        role: p.role,
        note: p.note || undefined,
      })),
      grammarPoints: parsed.grammarPoints.map((g) => ({
        point: g.point,
        explanation: g.explanation,
        example: g.example || undefined,
      })),
      chunks: parsed.chunks.map((c) => ({
        text: c.text,
        pinyin: c.pinyin,
        meaning: c.meaning,
        collocation: c.collocation || undefined,
      })),
      vocabulary: parsed.vocabulary
        .filter((v) => !isKnown(v.word, threshold))
        .map((v) => ({
          word: v.word,
          pinyin: v.pinyin,
          meaning: v.meaning,
          usage: v.usage || undefined,
          collocations: v.collocations.length ? v.collocations : undefined,
          hskNew: hskNew(v.word),
          hskOld: hskOld(v.word),
        })),
    };

    cache.set(key, analysis);
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "API 키가 올바르지 않습니다." },
        { status: 502 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "요청이 몰렸습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `분석 서버 오류 (${error.status})` },
        { status: 502 },
      );
    }

    throw error;
  }
}
