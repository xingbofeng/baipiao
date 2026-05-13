---
translationStatus: translated
---
# CLI

`baipiao` 명령줄 인터페이스입니다. 각 명령은 단독 실행이 가능하고, 필요 시 전체 설정 파이프라인으로 연결할 수 있습니다.

## 시작하기

첫 서비스를 설치하고 설정하세요:

```bash
# CLI 설치
npm install -g baipiao

# 현재 프로젝트 초기화
baipiao init --name my-ai-tool

# 무료 LLM 서비스 검색
baipiao search llm

# 설정 프롬프트 생성 및 Agent 출력 반영
baipiao setup groq

# Vault에서 .env.local 생성
baipiao env generate

# Groq 연결 테스트
baipiao test groq
```

전체 무료 카탈로그 검색:

```bash
# 키워드로 전체 후보 카탈로그 검색
baipiao catalog candidates --query openrouter

# 정규화된 카테고리로 필터
baipiao catalog candidates --category llm

# 지정 로케일로 후보 필드 반환
baipiao catalog candidates --locale zh-CN
```

## init

```text
baipiao init [--name <name>]
```

프로젝트 컨텍스트를 초기화합니다. `.baipiao/` 디렉터리 스켈레톤을 생성합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `--name` | `<string>` | 프로젝트 이름으로 슬러그로도 사용됩니다. 생략 시 현재 디렉터리 이름을 사용합니다. |

**출력**

```text
✓ Initialized baipiao in /home/user/my-ai-tool
  Created .baipiao/project.json
  Created .baipiao/services.json
  Created .env.local
  Created .env.example
```

이미 초기화된 경우:

```text
⚠ Project already initialized at /home/user/my-ai-tool
```

**예시**

```bash
baipiao init
baipiao init --name my-ai-tool
```

## search

```text
baipiao search <query>
```

전체 `free-for-dev` 카탈로그를 키워드 또는 카테고리로 검색합니다. fuzzy 검색과 다국어 키워드를 지원합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<query>` | `string` | 검색 키워드. 카테고리명, 서비스명, 비슷한 철자, 다국어 키워드를 지원합니다. |

**출력**

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

기능 태그:

| 태그 | 의미 |
| --- | --- |
| `prompt` | 에이전트 설정 프롬프트를 생성할 수 있습니다 |
| `config` | 구조화된 env 키를 검증하고 영구 저장할 수 있습니다 |
| `test` | 연결 테스트를 자동으로 실행할 수 있습니다 |

**예시**

```bash
baipiao search llm
baipiao search database
baipiao search storage
```

## catalog

```text
baipiao catalog candidates [--query <query>] [--category <category>] [--source-category <sourceCategory>] [--locale <locale>] [--limit <n>] [--offset <n>]
baipiao catalog categories
baipiao catalog localize --locale <locale> --input <path>
baipiao catalog translation-batch --locale <locale> [--query <query>] [--category <category>] [--source-category <sourceCategory>] [--limit <n>] [--offset <n>] [--include-translated]
```

`free-for-dev` 후보 전체 조회와 오프라인 로컬라이제이션 워크플로입니다. `candidates`는 키워드/카테고리 필터링된 전체 정규화 카탈로그를 반환하고, `categories`는 카테고리 개수를 반환하며, `translation-batch`는 번역할 필드를 내보내고, `localize`는 번역 결과를 `enrichment.localization`에 반영합니다.

지원 로케일:

| 로케일 | 의미 |
| --- | --- |
| `en` | 영어 원본 |
| `zh-CN` | 중국어(간체) |
| `ja` | 일본어 |
| `ko` | 한국어 |
| `fr` | 프랑스어 |
| `es` | 스페인어 |

**예시**

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog translation-batch --locale ja --limit 100
baipiao catalog localize --locale ja --input translations.ja.json
```

## info

```text
baipiao info <service>
```

서비스 메타데이터를 확인합니다: 링크, env 필드, 무료 티어 상세, 위험 노트.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<service>` | `string` | 서비스 ID 또는 슬러그(예: `groq`, `openrouter`, `supabase`) |

**출력**

```text
Groq

  Category    llm
  Homepage    https://groq.com
  Console     https://console.groq.com
  API Keys    https://console.groq.com/keys
  Docs        https://console.groq.com/docs

  Free Tier
  Free tier with rate limits for supported models.
  Requires credit card: No
  Reset cycle: daily

  Environment Variables
  GROQ_API_KEY (secret, required)
    Pattern: ^gsk_[A-Za-z0-9]+$

  Capabilities
  prompt  config  test

  Risks
  • 속도 제한은 모델별로 적용됩니다
  • 프로덕션에 사용하기 전에 현재 무료 티어 사용 가능 여부를 확인하세요
```

**예시**

```bash
baipiao info groq
baipiao info supabase
```

## prompt

```text
baipiao prompt <service> [--copy]
```

안전한 에이전트 설정 프롬프트를 생성합니다. 구조화된 서비스(YAML 설정 포함)는 정밀한 프롬프트를, 비구조화 서비스는 범용 템플릿을 생성합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<service>` | `string` | 서비스 ID 또는 슬러그 |
| `--copy` | `boolean` | 생성된 프롬프트를 시스템 클립보드에 복사 |

**출력**(구조화 서비스 — Groq 예시)

```text
당신은 제 브라우저 설정 도우미입니다.

목표:
Groq 무료 티어 리소스 구성을 도와주시고 필요한
API 키를 만들어 주세요.

진입 페이지:
https://console.groq.com/keys

단계:
1. If not logged in, pause and ask me to complete login, CAPTCHA,
   email verification, or 2FA.
2. Create a new API key.
3. Use the name baipiao-${project_slug}.
4. Copy the generated API key.

안전 규칙:
• Do not ask for or store my web login password.
• Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
• Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
• Do not enable any paid feature.

완료되면 다음 한 줄만 출력하세요:
GROQ_API_KEY=...
```

**예시**

```bash
baipiao prompt groq
baipiao prompt groq --copy
baipiao prompt huggingface # huggingface.co 무료 카탈로그 후보로 해석
```

## setup

```text
baipiao setup <service>
```

대화형 전체 설정 플로우: 프롬프트 생성 → Agent 출력 대기 → 파싱 → 검증 → 저장 → env 작성 → 테스트.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<service>` | `string` | 서비스 ID 또는 슬러그 |

**대화형 흐름**

```text
$ baipiao setup groq

→ Generating setup prompt for Groq...
✓ 프롬프트를 클립보드에 복사했습니다

Paste the Agent's output below (end with an empty line):
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

✓ Parsed 1 entry
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
→ Running connection test...
✓ Connection test passed (latency: 234ms)

상태: tested
```

**상태 머신**

```text
not_started → prompt_generated → agent_output_received
  → configured_unverified → configured → tested
```

**예시**

```bash
baipiao setup groq
baipiao setup supabase
```

## output

```text
baipiao output <service> [--input <text>]
```

`setup`과 동일한 진입점으로, 외부 소스에서 Agent 출력을 받아 저장용으로 임포트합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<service>` | `string` | 서비스 ID 또는 슬러그 |
| `--input` | `<string>` | 대화형 붙여넣기 단계를 건너뛰고 KEY=VALUE 텍스트를 직접 전달 |

**지원 입력 형식**

- Env 형식: `KEY=VALUE`
- 펜싱된 코드 블록:
  ````text
  ```env
  GROQ_API_KEY=gsk_xxx
  ```
  ````
- 콜론 형식: `API Key: abc`, `Endpoint: https://example.com`

**예시**

```bash
baipiao output groq
baipiao output groq --input "GROQ_API_KEY=gsk_xxx"
```

## env generate

```text
baipiao env generate [--example] [--include-unverified]
```

저장된 Vault 구성으로 환경 변수 파일을 작성합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `--example` | `boolean` | `.env.example` 작성(키 이름만, 값 없음) |
| `--include-unverified` | `boolean` | 위험 경고와 함께 미검증 설정 포함 |

**출력**

```text
$ baipiao env generate
✓ .env.local written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

$ baipiao env generate --example
✓ .env.example written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
```

**예시**

```bash
baipiao env generate
baipiao env generate --example
baipiao env generate --include-unverified
```

## test

```text
baipiao test [<service>]
```

서비스 연결을 테스트합니다. 서비스를 지정하지 않으면 현재 프로젝트에서 추적 중인 모든 서비스를 테스트합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<service>` | `string` | 선택 사항. 서비스 ID 또는 슬러그 |

**출력**

```text
$ baipiao test groq

Groq
  Test type: openai_compatible_chat
  Status: passed
  Latency: 234ms

$ baipiao test free-for-dev:apis-data-and-ml:huggingface-co

Hugging Face candidate
  Test type: not supported
  Status: skipped
```

**지원 테스트 타입**

| 타입 | 설명 |
| --- | --- |
| `openai_compatible_chat` | 채팅 완성 요청을 보내 API 키를 검증합니다(Groq, OpenRouter) |
| `http` | HTTP GET/POST 검증(Gemini) |
| `supabase` | Supabase URL + Anon Key를 검증합니다 |
| `s3_compatible` | S3 호환 스토리지 연결성 검증(Cloudflare R2) |

**예시**

```bash
baipiao test
baipiao test groq
baipiao test supabase
```

## status

```text
baipiao status
```

현재 프로젝트의 전체 상태 요약을 표시합니다.

**출력**

```text
baipiao Status

Project
  Name      my-ai-tool
  Slug      my-ai-tool
  Env path  .env.local

Services
  groq            tested
  openrouter      not_started
  gemini          configured
  supabase        tested

Vault
  Total entries   6
  Stored          5
  Missing         1

Quick actions
  baipiao setup openrouter
  baipiao vault health
  baipiao env generate
```

**예시**

```bash
baipiao status
```

## stack recommend

```text
baipiao stack recommend <type>
```

프로젝트 유형별로 무료 기술 스택을 추천합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | 프로젝트 타입 |

**출력**

```text
$ baipiao stack recommend ai_saas

Recommended Stack: AI SaaS

  LLM         groq / openrouter
  Database    supabase
  Storage     cloudflare-r2
  Auth        clerk
  Email       resend
  Monitoring  (none recommended)
```

**예시**

```bash
baipiao stack recommend ai_saas
baipiao stack recommend rag
baipiao stack recommend blog
```

## setup-stack

```text
baipiao setup-stack <type>
```

추천 스택의 각 서비스에 대해 설정 프롬프트 섹션을 출력합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | 프로젝트 타입 |

**예시**

```bash
baipiao setup-stack ai_saas
```

## vault

```text
baipiao vault [<subcommand>]
```

통합 키 관리 센터입니다. 하위 명령 없이 사용하면 Vault 요약을 표시합니다.

**하위 명령**

### vault list

```text
baipiao vault list [--service <service>]
```

모든 키 상태를 표시합니다. 평문 값은 출력되지 않습니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `--service` | `<string>` | 선택 사항. 특정 서비스로 필터링 |

```text
KEY                           STATUS     SCOPE    SERVICE
GROQ_API_KEY                  stored     server   groq
GEMINI_API_KEY                stored     server   gemini
SUPABASE_URL                  stored     public   supabase
SUPABASE_ANON_KEY             stored     public   supabase
OPENROUTER_API_KEY            missing    server   openrouter
```

### vault set

```text
baipiao vault set <KEY> [--service <service>]
```

단일 시크릿을 직접 저장합니다. 입력은 숨김 처리되며 에코되지 않습니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<KEY>` | `string` | 환경 변수 키 이름 |
| `--service` | `<string>` | 선택 사항. 연결된 서비스 ID |

```text
$ baipiao vault set GROQ_API_KEY
Enter value for GROQ_API_KEY: ********
✓ GROQ_API_KEY saved to Vault
✓ Matched service: groq
```

### vault import

```text
baipiao vault import [--service <service>]
```

KEY=VALUE 텍스트를 일괄 임포트합니다. 파싱, 검증, 저장을 자동으로 처리합니다.

```text
$ baipiao vault import
Paste KEY=VALUE lines (end with empty line):
GROQ_API_KEY=gsk_xxx
GEMINI_API_KEY=xxx

✓ Parsed 2 entries
✓ GROQ_API_KEY saved
✓ GEMINI_API_KEY saved
```

### vault copy

```text
baipiao vault copy <KEY>
```

지정한 키 값을 클립보드로 복사합니다. 터미널에는 출력되지 않습니다.

```text
$ baipiao vault copy GROQ_API_KEY
✓ GROQ_API_KEY copied to clipboard
✓ Clipboard will be cleared in 30 seconds
```

### vault reveal

```text
baipiao vault reveal <KEY>
```

지정 키의 평문 값을 터미널에 표시합니다. **명시적 확인이 필요합니다.** MCP에서 노출되지 않습니다.

```text
$ baipiao vault reveal GROQ_API_KEY
This will print the secret value in your terminal. Continue? y/N
```

### vault remove

```text
baipiao vault remove <KEY>
```

시스템 자격 증명 저장소에서 지정 키를 삭제합니다.

```text
$ baipiao vault remove GROQ_API_KEY
✓ GROQ_API_KEY removed from Vault
⚠ This key still appears in .env.local. Remove it? y/N
```

### vault health

```text
baipiao vault health
```

저장된 모든 키의 상태와 형식 유효성을 확인합니다.

```text
✓ GROQ_API_KEY              format valid / connection passed
! OPENROUTER_API_KEY        missing
✓ GEMINI_API_KEY            format valid / connection passed
! SUPABASE_SERVICE_ROLE_KEY server-only, do not expose to frontend
```

## mcp

```text
baipiao mcp
baipiao mcp --dry-run
```

AI 코딩 도구용 MCP stdio 서버를 시작합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `--dry-run` | `boolean` | 실제 서버는 시작하지 않고 준비 상태만 확인 |

**예시**

```bash
baipiao mcp
baipiao mcp --dry-run
```

## mcp install

```text
baipiao mcp install <client> [--port <port>]
```

baipiao를 대상 MCP 클라이언트에 설치합니다. 필요한 클라이언트 설정을 직접 업데이트합니다.

| 인수 | 타입 | 설명 |
| --- | --- | --- |
| `<client>` | `cursor \| claude \| codex` | 대상 AI 코딩 도구 |
| `--port` | `<number>` | `http://127.0.0.1:<port>/mcp`를 가리키는 HTTP 클라이언트 설정 설치 |

**수동 설정 map** (stdio 모드)

```json
{
  "mcpServers": {
    "baipiao": {
      "command": "baipiao",
      "args": ["mcp"]
    }
  }
}
```

**수동 설정 map** (HTTP 모드)

```json
{
  "mcpServers": {
    "baipiao": {
      "url": "http://127.0.0.1:7331/mcp"
    }
  }
}
```

> `baipiao mcp --port 7331`로 HTTP 서버를 시작하고, `baipiao mcp install <client> --port 7331`로 일치하는 클라이언트 설정을 설치하세요.

**예시**

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex --port 7331
```

## 보안 기대 동작

- 과금, 업그레이드, 구독 클릭을 자동화하지 않습니다
- 웹 로그인 비밀번호를 저장하지 않습니다
- CAPTCHA, 2FA, 휴대폰 인증, 플랫폼 위험 검사를 우회하지 않습니다
- `vault list`는 평문을 출력하지 않으며, `vault copy`는 터미널 대신 클립보드를 사용합니다
- MCP는 `vault_reveal`, `get_secret_value`, `shell_exec`, `browser_click` 및 유사한 위험 엔드포인트를 노출하지 않습니다
- 로그와 상태 출력은 기본적으로 마스킹되어 표시됩니다
