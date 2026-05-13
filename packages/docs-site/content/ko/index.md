---
translationStatus: translated
---
# 빠른 시작

`baipiao`는 무료 개발자 서비스 설정을 위한 **Prompt-first / MCP-first** CLI입니다. 무료 티어 서비스 발견, AI 코딩 에이전트용 안전한 설정 프롬프트 생성, 에이전트 결과 수집, 로컬 Vault에 키 저장, `.env` 파일 생성, 연결 테스트, MCP를 통한 AI 도구 노출까지 한 번에 처리합니다.

## 시작하기

```bash
npm install -g baipiao
baipiao init --name my-ai-tool
baipiao search llm
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
```

전체 무료 카탈로그를 확인하려면:

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog candidates --locale zh-CN
```

MCP 설정은 다음으로 진행합니다:

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

## 30초 이해하기

`baipiao`는 단순 키 저장 스크립트가 아닙니다. "무료 서비스를 찾고, 에이전트에 설정을 맡긴 뒤 결과를 안전하게 되돌리는" 과정을 다음과 같은 안정적인 워크플로우로 나눕니다.

| 필요한 작업 | 진입점 | 결과 |
|---|---|---|
| 큐레이션된 무료 서비스 찾기 | `baipiao search llm` | 설정/테스트 기능이 있는 서비스 목록 |
| 전체 무료 카탈로그 검색 | `baipiao catalog candidates --query openrouter` | `free-for-dev` 전체 후보 검색 |
| 언어별 후보 조회 | `baipiao catalog candidates --locale zh-CN` | 영어 원문을 대체한 로컬라이즈 필드 |
| 서비스 설정을 에이전트에 위임 | `baipiao setup groq` | 안전한 설정 프롬프트 생성 + 에이전트 출력 수집 |
| 키 및 env 파일 관리 | `baipiao vault list` / `baipiao env generate` | Vault 저장 및 `.env.local` 생성 |
| 에이전트에 기능 노출 | `baipiao mcp` | 동일한 기능을 MCP 도구로 제공 |

핵심 파이프라인은 다음과 같습니다.

```text
서비스 탐색 → 프롬프트 생성 → 에이전트 실행 → 출력 파싱 → Vault 저장 → env 생성 → 연결 테스트 → MCP 노출
```

계정 생성은 자동화하지 않고, 브라우저를 직접 제어하지 않으며, 웹 로그인 비밀번호를 저장하지 않습니다. 로그인, CAPTCHA, 2FA, 결제 관련 민감 동작은 사람이 직접 처리합니다.

## 사전 조건

- **Node.js >= 20**
- **pnpm** (패키지 매니저)
- 터미널 (macOS Terminal / iTerm2 / Windows Terminal / Linux shell)
- MCP 지원 AI 코딩 도구(선택): Cursor / Claude Code / Codex

## 설치

```bash
# npm에서 전역 설치
npm install -g baipiao

# 버전 확인
baipiao --version
```

## 3가지 사용 경로

원하는 작업 유형에 맞는 경로를 선택하세요.

| 경로 | 진입점 | 목적 |
|---|---|---|
| **구조화된 서비스 설정** | `search` / `info` / `setup` | Groq, OpenRouter, Supabase 같은 알려진 서비스를 설정 |
| **전체 무료 카탈로그** | `catalog candidates` | 언어, 카테고리, 키워드로 `free-for-dev` 후보 검색 |
| **에이전트 인터페이스** | `mcp` | Cursor / Claude Code / Codex가 서비스, 프롬프트, Vault, env, 테스트 도구를 호출하도록 허용 |

대부분의 프로젝트는 구조화 설정으로 시작하고, 더 많은 무료 후보가 필요할 때 `catalog`를 사용하며, 에이전트가 프로젝트/서비스 상태를 계속 읽어야 하면 MCP를 추가합니다.

## 첫 서비스를 위한 5단계

예시로 **Groq**(무료 LLM API)를 사용합니다.

### 1단계: 프로젝트 초기화

```bash
baipiao init --name my-ai-tool
```

`project.json`, `services.json`, `.env.local`, `.env.example`이 포함된 `.baipiao/`를 생성합니다.

### 2단계: 검색 및 확인

```bash
# 무료 LLM 서비스 검색
baipiao search llm

# Groq 확인: 필수 env 키, 무료 티어 제한, 위험 노트
baipiao info groq
```

`search` 출력 예시:

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

### 3단계: 에이전트 설정 프롬프트 생성

```bash
baipiao prompt groq --copy
```

`--copy`는 프롬프트를 클립보드에 복사합니다. 프롬프트에는 다음이 포함됩니다.
- 대상 페이지 URL(예: `https://console.groq.com/keys`)
- 단계별 지침(API 키 생성, 네이밍 규칙)
- **안전 경계**(과금/결제 버튼 클릭 금지, 비밀번호 입력 금지, CAPTCHA 우회 금지)
- 기대 출력 형식 (`GROQ_API_KEY=...`)

해당 프롬프트를 에이전트(Cursor / Claude Code / Codex)에 붙여넣습니다. 에이전트가 브라우저 작업을 수행하고 결과를 반환합니다.

### 4단계: 출력 파싱 및 저장

```bash
baipiao setup groq
```

에이전트 출력 붙여넣기:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

`setup`은 자동으로 다음을 수행합니다: `KEY=VALUE` 파싱 → 형식 검증 → Vault 저장 → `.env.local` 작성 → 연결 테스트 → 서비스 상태 업데이트.

### 5단계: 검증

```bash
# 전체 프로젝트 상태 확인
baipiao status

# Groq 연결 테스트
baipiao test groq

# Vault 키 전체 목록(평문 미표시)
baipiao vault list
```

## 전체 명령어 참고

### 프로젝트 초기화

- `baipiao init [--name <name>]` — `.baipiao` 프로젝트 골격 생성

### 서비스 탐색

- `baipiao search <query>` — 키워드 또는 카테고리(`llm`, `database`, `storage`)로 무료 서비스 검색
- `baipiao info <service>` — 서비스 메타데이터, env 필드, 무료 티어, 위험 항목 확인

### 전체 무료 카탈로그

- `baipiao catalog candidates` — `free-for-dev` 후보 카탈로그 전체 목록
- `baipiao catalog candidates --query openrouter` — 입력값으로 후보 검색
- `baipiao catalog candidates --category llm` — 정규화 카테고리로 필터링
- `baipiao catalog candidates --locale zh-CN` — 지정 로케일의 후보 필드 반환
- `baipiao catalog categories` — 후보 카테고리 개수 표시
- `baipiao catalog translation-batch --locale ja` — 번역용 항목 추출
- `baipiao catalog localize --locale ja --input translations.ja.json` — 오프라인 번역 반입

### 프롬프트 생성

- `baipiao prompt <service> [--copy]` — 안전한 에이전트 설정 프롬프트 생성

### 설정

- `baipiao setup <service>` — 대화형 전체 설정 흐름
- `baipiao output <service>` — 외부 출력에서 설정 불러오기

### Vault

- `baipiao vault` — Vault 개요
- `baipiao vault list` — 전체 키 상태 표시(평문 없음)
- `baipiao vault set <KEY>` — 단일 키 수동 저장
- `baipiao vault import` — `KEY=VALUE` 일괄 임포트
- `baipiao vault copy <KEY>` — 키를 클립보드로 복사
- `baipiao vault remove <KEY>` — 키 삭제
- `baipiao vault health` — 저장 키 건전성 점검

### env 관리

- `baipiao env generate` — Vault에서 `.env.local` 생성
- `baipiao env generate --example` — `.env.example` 생성(키 이름만)

### 테스트 및 상태

- `baipiao test [service]` — 서비스 연결 테스트(OpenAI 호환/HTTP/Supabase/S3 지원)
- `baipiao status` — 프로젝트 전체 상태 요약

### 스택 추천

- `baipiao stack recommend <type>` — 프로젝트 유형별 무료 스택 추천
  - `type`: `ai_saas` / `rag` / `blog` / `agent_tool` / `mobile_app` / `custom`
- `baipiao setup-stack <type>` — 스택의 모든 서비스에 대한 설정 프롬프트 배치 생성

### MCP 통합

- `baipiao mcp` — MCP stdio 서버 시작
- `baipiao mcp install <cursor|claude|codex>` — MCP 클라이언트 설정 출력

## 서비스 기능 수준

`baipiao`의 각 서비스는 기능 태그를 갖습니다.

| 태그 | 의미 |
|---|---|
| `prompt` | 에이전트 설정 프롬프트 생성 가능 |
| `config` | 구조화 env 키 검증/영속화 가능 |
| `test` | 연결 테스트 자동 실행 가능 |

모든 서비스는 최소 `prompt`를 지원합니다. 구조화된 설정 서비스를 가진 항목은 `config` 및 `test`도 추가로 지원합니다.

## 프로젝트 유형별 추천 스택

`baipiao stack recommend` 출력 기준 예시입니다.

**AI SaaS (`ai_saas`)**

```text
LLM       → groq / openrouter
Database  → supabase
Storage   → cloudflare-r2
Auth      → clerk
Email     → resend
```

**RAG (`rag`)**

```text
LLM       → groq / gemini
Vector DB → supabase (pgvector)
Storage   → cloudflare-r2
```

## 보안 모델

`baipiao`는 "비밀값이 유출되지 않는다"는 원칙으로 설계되었습니다.

- **Vault**는 시스템 키체인에 비밀 키를 저장합니다(macOS Keychain / Windows Credential Manager / Linux Secret Service)
- 모든 로그와 상태 출력은 **자동 마스킹 처리**되어 터미널에 평문이 출력되지 않습니다
- MCP는 위험 엔드포인트를 공개하지 않습니다: `vault_reveal`, `get_secret_value` 등

- 생성되는 모든 프롬프트에는 필수 안전 경계가 포함됩니다: Billing/Upgrade 클릭 금지, CAPTCHA 우회 금지, 비밀번호 저장 금지
- `.env.example`에는 키 이름만 포함되며 값은 절대 포함되지 않습니다

## 아키텍처 개요

```text
packages/
  cli/           — Terminal command entry point
  core/          — Shared logic: registry, prompt engine, parser, Vault, env, tester
  mcp-server/    — MCP protocol server exposing allowlisted tools

registry/
  catalog/       — Service catalog and category data
  configs/       — Per-service structured YAML configs

templates/
  prompts/       — Prompt templates (structured / generic)
```

## 다음 단계

- 전체 CLI 명령 참조 → [CLI 문서](/docs/ko/cli)
- MCP 도구 계약 및 보안 경계 → [MCP 문서](/docs/ko/mcp)
