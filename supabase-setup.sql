-- 학습 기록 테이블. Supabase 대시보드의 SQL Editor에 붙여넣고 실행한다.
-- IRB 승인 후 기록을 켜기 전에 한 번만 하면 된다.

create table if not exists study_events (
  id          uuid primary key default gen_random_uuid(),
  subject     text        not null,  -- 가명 식별자. 누구인지 알 수 없다
  cohort      text        not null,  -- 'class'(수강생) 또는 'public'(외부)
  research_ok boolean     not null,  -- 연구 활용 가능 여부
  event       text        not null,  -- analyze / play_all / play_by_chunk / play_chunk / play_word / play_collocation
  sentence    text,                  -- 분석 요청한 문장
  detail      jsonb,                 -- 재생 속도, 덩어리 순번 등
  at          timestamptz not null default now()
);

create index if not exists study_events_subject_idx on study_events (subject);
create index if not exists study_events_at_idx      on study_events (at);
create index if not exists study_events_cohort_idx  on study_events (cohort);

-- 브라우저에서 직접 읽거나 쓰지 못하게 막는다.
-- 서버만 service_role 키로 접근하며, 그 키는 Vercel 환경변수에만 둔다.
alter table study_events enable row level security;


-- ── 분석할 때 쓰는 질의 ──────────────────────────────────────────

-- 논문용: 수강생 중 연구에 동의한 기록만
-- select * from study_events where cohort = 'class' and research_ok;

-- 어느 문장이 자주 막히는가 (같은 문장을 여러 번 분석한 순서)
-- select sentence, count(*) as 횟수, count(distinct subject) as 사람수
-- from study_events where event = 'analyze' and sentence is not null
-- group by sentence order by 횟수 desc limit 30;

-- 어느 덩어리를 반복해서 듣는가 (막히는 지점)
-- select detail->>'text' as 덩어리, count(*) as 재생횟수
-- from study_events where event = 'play_chunk'
-- group by 1 order by 재생횟수 desc limit 30;

-- 수강생과 외부 이용자의 사용량 비교
-- select cohort, count(*) as 이벤트, count(distinct subject) as 사람수
-- from study_events group by cohort;
