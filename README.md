# 미디어 중국어 독해

중어중문학과 시사 독해 수업용 웹앱. 중국어 문장을 넣으면 해석·문장 구조·새 단어를 보여주고,
搭配 단위로 끊어서 낭독해 준다.

## 키 준비

`.env.example`을 `.env.local`로 복사한 뒤 채운다.

```bash
cp .env.example .env.local
```

| 변수 | 발급처 | 비고 |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | 독해 분석. 선불 크레딧 |
| `CLASS_CODE` | 직접 정함 | 학생들에게 나눠줄 코드. 비우면 게이트 없음 |
| `KNOWN_HSK_LEVEL` | 기본 `4` | 이 급수 이하는 아는 단어로 보고 제외 |

키 없이도 실행은 되며, 첫 화면의 **예시 보기**로 전체 기능 화면을 볼 수 있다.

## 실행

```bash
npm install && npm run dev
```

## 배포 (Vercel)

1. 이 폴더를 GitHub 저장소로 올린다
2. vercel.com에서 저장소를 import
3. Settings → Environment Variables에 위 표의 변수를 그대로 등록
4. Deploy

`.env.local`은 `.gitignore`에 포함되어 있어 저장소에 올라가지 않는다.

## 구조

- `src/app/api/analyze` — Claude로 해석·구조·단어 분석 (결과를 메모리에 캐싱)
- `src/app/api/auth` — 수업 코드 확인
- `src/lib/speech.ts` — 브라우저 내장 음성(Web Speech API) 공용 모듈. 서버를 거치지 않는다
- `src/components/Playback.tsx` — 문장 낭독. 목소리·속도 조절 UI가 여기 있다
- `src/components/Vocab.tsx` — 새 단어. 단어와 搭配를 누르면 발음된다

목소리와 속도는 `Reader.tsx`가 들고 있어서 낭독과 새 단어가 같은 설정을 쓴다.
- `src/lib/hsk.ts` — HSK 급수 조회
- `src/data/hsk-levels.json` — 신HSK(3.0)·구HSK(2.0) 급수 11,470개

## 성능

분석은 Claude Sonnet 5, effort `low`로 돈다. 43자 문장 기준 **약 24초**.
(Opus 5는 37초였고 단어·문법을 조금 더 많이 짚었다. 바꾸려면
`src/app/api/analyze/route.ts`의 `model`을 `claude-opus-5`로.)

입력은 **150자**로 제한했다(`src/lib/limits.ts`). 배포 환경의 서버리스 함수 제한이
60초이고 글자 수에 비례해 시간이 늘기 때문이다. 같은 문장을 다시 넣으면 캐시에서 즉시 나온다.

## 화면

주간·야간 두 테마가 있고 우측 상단 버튼으로 바꾼다. 선택은 `localStorage`에 남아
다음에 열 때도 유지된다. 기본은 주간이다.

색은 `src/app/globals.css`에 토큰으로 모아뒀다 — 주간 값은 `@theme`에,
야간 값은 `[data-theme="dark"]`에 있다. 두 벌의 값만 고치면 전체 화면이 따라간다.
테마는 `<html data-theme>`에 들어가며, `layout.tsx`의 인라인 스크립트가 React보다 먼저
값을 넣어 새로고침할 때 화면이 번쩍이지 않게 한다.

## 알아둘 것

**낭독은 브라우저 내장 음성을 쓴다.** 키도 서버도 필요 없지만 한계가 있다.
SSML을 못 쓰므로 덩어리를 개별 발화로 이어 붙이는 방식이라, 덩어리마다 문장 끝 억양이
떨어진다. 음질도 OS 기본 음성 수준이다. 낭독 품질을 올리려면 Azure TTS로 바꿔야 한다
(SSML `<break>`로 끊어읽기를 제어할 수 있다).

음성은 본토(zh-CN) **여성·남성 두 개만** 목록에 올린다. 대만·홍콩 음성은 제외한다.

윈도우와 맥에 공통으로 존재하는 음성 이름은 없으므로, `src/lib/speech.ts`의 `FEMALE`·`MALE`에
OS별 후보를 나열해두고 그 기기에서 찾아지는 첫 번째를 쓴다. 실제로 뽑히는 조합:

| 환경 | 여성 | 남성 |
|---|---|---|
| macOS | Tingting | Eddy |
| Windows 10 + Chrome | Google 普通话 | Microsoft Kangkang |
| Windows 11 + Edge | Microsoft Xiaoxiao | Microsoft Yunxi |
| Android Chrome | Google 普通话 | (없음 — 여성만 표시) |

후보를 하나도 못 찾으면 그 기기에 설치된 본토 음성을 그대로 쓴다.

**搭配 분절 자체는 Claude가 한다.** 가끔 오분절이 난다.

**새 단어 판정은 신·구 HSK 중 높은 쪽을 따른다.** 신HSK 3.0은 어휘를 구HSK보다 낮은 급수에
배치해서(`面临`은 신4급이지만 구5급), 낮은 쪽을 기준으로 삼으면 짚어야 할 단어가 빠진다.

**녹음·발음 평가 기능은 없다.** 붙인다면 녹음·재생 자체는 브라우저의 `MediaRecorder`만으로
API 키 없이 되지만, 발음 **정확도 채점**은 Azure 발음 평가 API가 필요하다.
그마저도 성조 오류를 콕 집어주는 기능은 어떤 상용 API도 제공하지 않는다.
