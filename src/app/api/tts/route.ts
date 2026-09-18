import { NextResponse } from "next/server";
import { MAX_CHARS } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 30;

const VOICES: Record<string, string> = {
  female: "zh-CN-XiaoxiaoNeural",
  male: "zh-CN-YunyangNeural",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 덩어리 사이에 <break>를 넣어 한 호흡으로 읽히게 한다. 억양은 문장 전체로 이어진다. */
function buildSsml(chunks: string[], voice: string, rate: number, breakMs: number) {
  const pause = breakMs > 0 ? `<break time="${Math.round(breakMs)}ms"/>` : "";
  const body = chunks.map(escapeXml).join(pause);
  const percent = Math.round((rate - 1) * 100);
  const rateAttr = percent >= 0 ? `+${percent}%` : `${percent}%`;
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">` +
    `<voice name="${voice}"><prosody rate="${rateAttr}">${body}</prosody></voice></speak>`
  );
}

/**
 * GET으로 받는다. 같은 요청이면 Vercel CDN이 오디오를 캐시해서
 * 여러 학생이 같은 문장을 들어도 Azure는 한 번만 호출된다.
 */
export async function GET(req: Request) {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  // 지역은 비밀값이 아니고 리소스가 한국 중부에 있어 기본값으로 둔다. 다른 지역이면 환경변수로 덮는다.
  const region = process.env.AZURE_SPEECH_REGION?.trim() || "koreacentral";
  if (!key) {
    return NextResponse.json({ error: "음성 서버가 설정되지 않았습니다." }, { status: 503 });
  }

  const params = new URL(req.url).searchParams;
  const chunks = params.getAll("c").filter((c) => c.length > 0);
  const joined = chunks.join("");

  if (!chunks.length || joined.length > MAX_CHARS) {
    return NextResponse.json({ error: "재생할 문장이 올바르지 않습니다." }, { status: 400 });
  }

  const voice = VOICES[params.get("v") ?? ""] ?? VOICES.female;
  const rate = Math.min(1.5, Math.max(0.5, Number(params.get("r")) || 1));
  const breakMs = Math.min(1500, Math.max(0, Number(params.get("b")) || 0));

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "zhongwen-reader",
    },
    body: buildSsml(chunks, voice, rate, breakMs),
  });

  if (!res.ok) {
    console.error("Azure TTS 실패", res.status, await res.text().catch(() => ""));
    // 무료 한도 초과(429) 등. 브라우저가 내장 음성으로 대신 읽는다.
    // 원인을 짚을 수 있게 Azure 응답 번호와 키 길이만 알린다. 키 값은 드러내지 않는다.
    return NextResponse.json(
      { error: `음성 합성에 실패했습니다 (Azure ${res.status})`, keyLength: key.length },
      { status: 502 },
    );
  }

  // 스트리밍 대신 한 번에 보낸다. 길이를 알아야 브라우저가 재생 시간을 계산하고,
  // 그래야 전체 재생 중 어느 덩어리를 읽는지 하이라이트할 수 있다.
  const audio = await res.arrayBuffer();

  return new NextResponse(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audio.byteLength),
      // 같은 문장·목소리·속도면 결과가 같으므로 오래 캐시해도 된다
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
    },
  });
}
