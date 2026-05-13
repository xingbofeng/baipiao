---
translationStatus: translated
---
# MCP

MCP는 외부 AI 코딩 도구(Claude Code, Cursor, Codex)에 `baipiao`의 핵심 기능을 노출하는 프로토콜 계층입니다. 모든 도구는 허용 목록(allowlist) 방식으로 동작하며, 위험한 작업은 명시적으로 차단됩니다.

## 시작하기

CLI를 설치하고 baipiao를 MCP 클라이언트에 등록하세요.

```bash
# CLI 설치
npm install -g baipiao

# Cursor용 MCP 설정 설치
baipiao mcp install cursor

# Claude Code용 MCP 설정 설치
baipiao mcp install claude

# Codex용 MCP 설정 설치
baipiao mcp install codex
```

복사 가능한 수동 설정 map:

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

일반적인 MCP 호출 예시:

```text
# 기본 검색은 전체 free-for-dev 카탈로그를 사용하며 fuzzy 검색을 지원
mcp: list_services { "query": "openruter", "limit": 20 }

# 언어, 페이지네이션, sourceCategory가 필요할 때
mcp: list_free_catalog_candidates { "query": "openrouter", "locale": "zh-CN", "limit": 20 }

# 서비스용 Agent 설정 프롬프트 생성
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

# 현재 프로젝트 상태 조회
mcp: get_status {}
```

## 서버 시작

```bash
baipiao mcp                # stdio 모드(기본)
baipiao mcp --dry-run      # 준비 상태 점검만
baipiao mcp --port 7331    # 로컬 HTTP MCP 서버
baipiao mcp install cursor # 클라이언트 설정 설치
```

## 프로토콜 호환성

MCP 서버는 현재 클라이언트가 사용하는 표준 JSON-RPC 수명 주기를 처리합니다.

- `initialize`는 협상된 protocol version, tools capability, `baipiao-mcp` server info를 반환합니다.
- `notifications/initialized`와 기타 notification은 JSON-RPC error response 없이 수락됩니다.
- `ping`은 빈 성공 결과를 반환합니다.
- HTTP 모드에서 notification-only 요청은 JSON-RPC error payload 대신 빈 body의 `202`를 반환합니다.

## 보안 선언

**MCP는 다음 항목을 노출하지 않습니다.**

`vault_reveal`, `get_secret_value`, `browser_click`, `browser_type`, `shell_exec`, `read_any_file`, `write_any_file`, `delete_file`, `upload_secret`

즉:
- Vault 평문 값은 외부 모델에 반환되지 않습니다
- 임의 파일 읽기/쓰기가 허용되지 않습니다
- 임의 쉘 또는 브라우저 실행이 허용되지 않습니다

**도구 주석 범례**

| 주석 | 의미 |
| --- | --- |
| 🔒 `readOnly` | 읽기 전용, 상태를 변경하지 않음 |
| ⚡ `idempotent` | 반복 실행해도 안전 |
| ⚠️ `destructive` | 데이터 수정 또는 삭제 |

---

## list_services

전체 `free-for-dev` 카탈로그를 키워드, 카테고리, 기능 태그로 검색합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | `string` | 아니오 | 검색 키워드 또는 카테고리 이름 |
| `category` | `string` | 아니오 | 카테고리로 필터링 |
| `capability` | `"prompt" \| "config" \| "test"` | 아니오 | 기능 태그로 필터링 |
| `limit` | `number` | 아니오 | 반환할 최대 개수 |

**출력**

```json
{
  "services": [
    {
      "id": "groq",
      "name": "Groq",
      "category": "llm",
      "capability": ["prompt", "config", "test"],
      "freeTier": "지원되는 모델에 대해 속도 제한이 있는 무료 티어."
    },
    {
      "id": "huggingface",
      "name": "Hugging Face",
      "category": "llm",
      "capability": ["prompt"],
      "freeTier": "속도 제한이 있는 무료 추론 API."
    }
  ]
}
```

## list_free_catalog_candidates

키워드, 카테고리, 소스 카테고리, 로케일, 제한 개수, 오프셋으로 `free-for-dev` 카탈로그 전체를 조회합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | `string` | 아니오 | 검색 키워드 |
| `category` | `string` | 아니오 | 정규화 카테고리로 필터 |
| `sourceCategory` | `string` | 아니오 | 상위 Markdown 섹션으로 필터 |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 아니오 | 요청한 출력 로케일 |
| `systemLocale` | `string` | 아니오 | 호스트 환경의 로케일 힌트 |
| `limit` | `number` | 아니오 | 반환할 최대 개수 |
| `offset` | `number` | 아니오 | 페이지네이션 오프셋 |

**출력**

```json
{
  "items": [],
  "total": 1237,
  "limit": 50,
  "offset": 0,
  "requestedLocale": "en"
}
```

## get_free_catalog_categories

후보 카탈로그 전체의 카테고리 및 소스 카테고리 개수를 반환합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 아니오 | 라벨을 위한 로케일 힌트 |

## get_free_catalog_translation_batch

한 로케일에서 미번역 후보의 원문 텍스트를 반환합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 예 | 대상 로케일 |
| `query` | `string` | 아니오 | 검색 키워드 |
| `category` | `string` | 아니오 | 정규화 카테고리로 필터 |
| `sourceCategory` | `string` | 아니오 | 상위 Markdown 섹션으로 필터 |
| `limit` | `number` | 아니오 | 반환할 최대 개수 |
| `offset` | `number` | 아니오 | 페이지네이션 오프셋 |
| `untranslatedOnly` | `boolean` | 아니오 | 완전 번역되지 않은 항목만 반환 |

## apply_free_catalog_translations

오프라인 번역을 `enrichment.localization`에 다시 씁니다. ⚡ `idempotent`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 예 | 대상 로케일 |
| `translations` | `array` | 예 | 번역 엔트리(`id`, `name?`, `description?`, `freeTierText?`) |

**출력**

```json
{
  "updated": 12,
  "missing": ["free-for-dev:generative-ai:missing-item"]
}
```

## get_service_info

서비스의 전체 메타데이터를 가져옵니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 예 | 서비스 ID 또는 슬러그 |

**출력**

```json
{
  "service": {
    "id": "groq",
    "name": "Groq",
    "slug": "groq",
    "category": "llm",
    "description": "무료 티어가 있는 빠른 LLM 추론 API입니다.",
    "urls": {
      "homepage": "https://groq.com",
      "console": "https://console.groq.com",
      "apiKeys": "https://console.groq.com/keys",
      "docs": "https://console.groq.com/docs"
    },
    "freeTier": {
      "summary": "지원되는 모델에 대해 속도 제한이 있는 무료 티어.",
      "requiresCreditCard": false,
      "resetCycle": "daily"
    },
    "env": [
      {
        "key": "GROQ_API_KEY",
        "secret": true,
        "required": true,
        "pattern": "^gsk_[A-Za-z0-9]+$",
        "description": "Groq API 키"
      }
    ],
    "capability": ["prompt", "config", "test"],
    "risks": [
      "속도 제한은 모델별로 적용됩니다",
      "프로덕션에 사용하기 전에 현재 무료 티어 사용 가능 여부를 확인하세요"
    ]
  }
}
```

## generate_setup_prompt

서비스용 Agent 설정 프롬프트를 생성합니다. 구조화된 서비스는 정밀한 프롬프트를, 비구조화 서비스는 일반 템플릿을 반환합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 예 | 서비스 ID 또는 슬러그 |
| `projectSlug` | `string` | 아니오 | 프롬프트 명명에 사용할 프로젝트 식별자 |

**출력**

```json
{
  "serviceId": "groq",
  "serviceName": "Groq",
  "prompt": "당신은 제 브라우저 설정 도우미입니다.\n\n목표:\nGroq 무료 티어 리소스 구성을 도와주세요...\n\n완료되면 다음 한 줄만 출력하세요:\nGROQ_API_KEY=...",
  "outputFormat": "GROQ_API_KEY=...",
  "requiredEnvKeys": ["GROQ_API_KEY"],
  "capability": ["prompt", "config", "test"]
}
```

## parse_agent_output

Agent가 반환한 텍스트에서 KEY=VALUE 항목을 파싱합니다. 영구 저장은 수행하지 않습니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `text` | `string` | 예 | Agent가 반환한 원본 텍스트 |
| `serviceId` | `string` | 아니오 | 형식 검증 및 필드 매핑에 사용할 서비스 ID |

**출력**

```json
{
  "entries": [
    { "key": "GROQ_API_KEY", "value": "gsk_xxx", "secret": true }
  ],
  "notes": ["KEY=VALUE 형식에서 1개 항목을 파싱했습니다"],
  "warnings": []
}
```

파싱 실패:

```json
{
  "entries": [],
  "notes": [],
  "warnings": [
    "3행을 파싱할 수 없습니다: 'some invalid text'"
  ]
}
```

**지원 입력 형식**

- 환경 변수 형식: `KEY=VALUE`
- 마크다운 펜스 코드 블록
- 콜론 형식: `API Key: abc`, `Endpoint: https://example.com`

## save_agent_output

Agent 출력을 파싱해 Vault에 저장합니다. ⚡ `idempotent`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 예 | 서비스 ID 또는 슬러그 |
| `text` | `string` | 예 | Agent가 반환한 원본 텍스트 |

**출력**

```json
{
  "saved": [
    { "key": "GROQ_API_KEY", "serviceId": "groq", "scope": "server" }
  ],
  "failed": [],
  "state": "configured"
}
```

부분 실패:

```json
{
  "saved": [
    { "key": "SUPABASE_URL", "serviceId": "supabase", "scope": "public" }
  ],
  "failed": [
    {
      "key": "SUPABASE_ANON_KEY",
      "reason": "패턴 불일치: 예상값 ^eyJ..."
    }
  ],
  "state": "configured_unverified"
}
```

## validate_secret

단일 키 값의 형식을 검증하고 일치하는 서비스를 반환합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `key` | `string` | 예 | 환경 변수 키 이름 |
| `value` | `string` | 예 | 검증할 값 |

**출력**

```json
{
  "valid": true,
  "key": "GROQ_API_KEY",
  "serviceIds": ["groq"],
  "reason": null
}
```

```json
{
  "valid": false,
  "key": "GROQ_API_KEY",
  "serviceIds": [],
  "reason": "Pattern mismatch: expected ^gsk_[A-Za-z0-9]+$"
}
```

## vault_list

Vault 내 모든 키의 메타데이터를 조회합니다. **평문 값은 절대 반환하지 않습니다.** 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 아니오 | 서비스 필터 |

**출력**

```json
{
  "entries": [
    {
      "key": "GROQ_API_KEY",
      "serviceId": "groq",
      "status": "stored",
      "scope": "server",
      "lastTestAt": "2026-05-12T12:03:04.000Z"
    },
    {
      "key": "OPENROUTER_API_KEY",
      "serviceId": "openrouter",
      "status": "missing",
      "scope": "server",
      "lastTestAt": null
    }
  ]
}
```

## vault_set

단일 비밀을 저장합니다. 값은 출력되지 않습니다. ⚡ `idempotent`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `key` | `string` | 예 | 환경 변수 키 이름 |
| `value` | `string` | 예 | 저장할 값(출력 없음) |
| `serviceId` | `string` | 아니오 | 연결된 서비스 ID |

**출력**

```json
{
  "saved": true,
  "key": "GROQ_API_KEY",
  "serviceId": "groq",
  "scope": "server"
}
```

## vault_import

KEY=VALUE를 일괄 임포트하며 자동 파싱/검증/저장을 수행합니다. ⚡ `idempotent`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `text` | `string` | 예 | 여러 줄 KEY=VALUE 텍스트 |
| `serviceId` | `string` | 아니오 | 연결된 서비스 ID |

**출력**

```json
{
  "saved": [
    { "key": "GROQ_API_KEY", "serviceId": "groq" },
    { "key": "GEMINI_API_KEY", "serviceId": "gemini" }
  ],
  "failed": [],
  "warnings": []
}
```

## vault_copy

키 값을 클립보드로 복사합니다. **값은 MCP를 통해 반환되지 않습니다.** ⚡ `idempotent`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `key` | `string` | 예 | 복사할 키 이름 |

**출력**

```json
{
  "copied": true,
  "key": "GROQ_API_KEY"
}
```

```json
{
  "copied": false,
  "key": "UNKNOWN_KEY",
  "reason": "Key not found in Vault"
}
```

## vault_remove

시스템 자격 증명 저장소에서 키를 삭제합니다. ⚠️ `destructive`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `key` | `string` | 예 | 삭제할 키 이름 |

**출력**

```json
{
  "removed": true,
  "key": "GROQ_API_KEY"
}
```

## vault_health

저장된 모든 키의 상태를 점검합니다. 🔒 `readOnly`

**입력**

없음

**출력**

```json
{
  "items": [
    {
      "key": "GROQ_API_KEY",
      "status": "healthy",
      "formatValid": true,
      "connection": "passed",
      "warnings": []
    },
    {
      "key": "SUPABASE_SERVICE_ROLE_KEY",
      "status": "warning",
      "formatValid": true,
      "connection": "passed",
    "warnings": ["서버 전용 키: 프런트엔드에 노출하지 마세요"]
    },
    {
      "key": "OPENROUTER_API_KEY",
      "status": "missing",
      "formatValid": null,
      "connection": null,
    "warnings": ["Vault에서 키를 찾을 수 없습니다"]
    }
  ]
}
```

## generate_env

Vault에서 환경 변수 파일을 생성합니다. ⚠️ `destructive` (파일시스템 쓰기)

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `path` | `string` | 아니오 | 대상 파일 경로, 기본은 `.env.local` |
| `example` | `boolean` | 아니오 | `.env.example` 생성(키 이름만) |
| `includeUnverified` | `boolean` | 아니오 | 미검증 항목도 포함 |

**출력**

```json
{
  "path": ".env.local",
  "writtenKeys": ["GROQ_API_KEY", "GEMINI_API_KEY", "SUPABASE_URL"],
  "missingKeys": ["OPENROUTER_API_KEY"]
}
```

## test_connection

지정 서비스의 연결 테스트를 수행합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 예 | 서비스 ID 또는 슬러그 |

**출력**

```json
{
  "serviceId": "groq",
  "ok": true,
  "status": "passed",
  "message": "연결 성공",
  "latencyMs": 234
}
```

```json
{
  "serviceId": "huggingface",
  "ok": false,
  "status": "skipped",
  "message": "이 서비스는 자동 테스트를 지원하지 않습니다",
  "latencyMs": null
}
```

## get_status

현재 프로젝트의 전역 상태 요약을 가져옵니다. 🔒 `readOnly`

**입력**

없음

**출력**

```json
{
  "project": {
    "name": "my-ai-tool",
    "slug": "my-ai-tool",
    "envPath": ".env.local"
  },
  "services": [
    { "serviceId": "groq", "state": "tested" },
    { "serviceId": "openrouter", "state": "not_started" },
    { "serviceId": "gemini", "state": "configured" },
    { "serviceId": "supabase", "state": "tested" }
  ],
  "vault": {
    "entryCount": 6,
    "storedCount": 5,
    "missingCount": 1
  },
  "env": {
    "ready": true
  },
  "test": {
    "status": "not_run"
  }
}
```

## recommend_stack

프로젝트 유형별로 무료 기술 스택을 추천합니다. 🔒 `readOnly`

**입력**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `useCase` | `"ai_saas" \| "rag" \| "blog" \| "agent_tool" \| "mobile_app" \| "custom"` | 예 | 프로젝트 유형 |

**출력**

```json
{
  "stack": {
    "useCase": "ai_saas",
    "services": [
      { "role": "LLM", "serviceId": "groq", "required": true },
      { "role": "LLM Backup", "serviceId": "openrouter", "required": false },
      { "role": "Database", "serviceId": "supabase", "required": true },
      { "role": "Storage", "serviceId": "cloudflare-r2", "required": true },
      { "role": "Auth", "serviceId": "clerk", "required": false },
      { "role": "Email", "serviceId": "resend", "required": false }
    ],
    "notes": [
      "모든 서비스는 무료 티어를 지원합니다",
      "먼저 groq를 설정하세요 - 다른 서비스는 인증 흐름에 의존할 수 있습니다"
    ]
  }
}
```

## 도구 개요

| 도구 | 유형 | 설명 |
| --- | --- | --- |
| `list_services` | 🔒 readOnly | 서비스 카탈로그 검색 |
| `get_service_info` | 🔒 readOnly | 서비스 상세 정보 가져오기 |
| `generate_setup_prompt` | 🔒 readOnly | 에이전트 설정 프롬프트 생성 |
| `parse_agent_output` | 🔒 readOnly | Agent 출력 파싱 |
| `save_agent_output` | ⚡ idempotent | Agent 출력을 Vault에 저장 |
| `validate_secret` | 🔒 readOnly | 키 형식 검증 |
| `vault_list` | 🔒 readOnly | Vault 메타데이터 목록 조회 |
| `vault_set` | ⚡ idempotent | 단일 키 저장 |
| `vault_import` | ⚡ idempotent | 다중 키 일괄 임포트 |
| `vault_copy` | ⚡ idempotent | 키를 클립보드로 복사 |
| `vault_remove` | ⚠️ destructive | 키 삭제 |
| `vault_health` | 🔒 readOnly | 키 건강 상태 점검 |
| `generate_env` | ⚠️ destructive | 환경 변수 파일 작성 |
| `test_connection` | 🔒 readOnly | 서비스 연결 테스트 |
| `get_status` | 🔒 readOnly | 프로젝트 상태 요약 |
| `recommend_stack` | 🔒 readOnly | 추천 스택 반환 |

## 설치 옵션

### Cursor

```bash
baipiao mcp install cursor
```

출력:

```json
{
  "client": "cursor",
  "transport": "stdio",
  "command": "baipiao",
  "args": ["mcp"]
}
```

### Claude / Codex (HTTP)

```bash
baipiao mcp install claude --port 7331
```

출력:

```json
{
  "client": "claude",
  "transport": "http",
  "url": "http://127.0.0.1:7331/mcp",
  "localOnly": true
}
```

> `baipiao mcp --port 7331`로 HTTP 서버를 시작하고, `baipiao mcp install <client> --port 7331`로 일치하는 클라이언트 설정을 설치하세요.

## 사용 예시

```text
1) LLM 서비스 검색
mcp: list_services { "query": "llm", "capability": "config", "limit": 10 }

2) Groq 상세 조회
mcp: get_service_info { "serviceId": "groq" }

3) 설정 프롬프트 생성
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

4) Agent 출력 저장
mcp: save_agent_output {
  "serviceId": "groq",
  "text": "GROQ_API_KEY=gsk_xxx"
}

5) 상태 조회
mcp: get_status {}

6) env 생성
mcp: generate_env { "example": false }
```
