# baipiao

**개발자를 위한 Agent-native 무료 스택 설정 도구.**

![Agent Native](https://img.shields.io/badge/agent--native-111827?style=flat-square)
![MCP Ready](https://img.shields.io/badge/MCP-ready-2563eb?style=flat-square)
![Local Vault](https://img.shields.io/badge/local--vault-secure-16a34a?style=flat-square)
![Free Stack](https://img.shields.io/badge/free--stack-configurator-7c3aed?style=flat-square)

[Website](https://baipiao.counterxing.top) · [Documentation](https://baipiao.counterxing.top/docs/ko) · [English](./README.md) · [中文](./README_zh.md) · [日本語](./README_ja.md) · [한국어](./README_ko.md) · [Français](./README_fr.md) · [Español](./README_es.md)

baipiao는 무료 개발 인프라를 정리하고, 에이전트와 협업하며 안전하게 설정 작업을 진행하기 위한 도구입니다.

무료 서비스를 찾고, 정확한 설정 프롬프트를 생성해 Codex / Claude Code / Cursor에 전달한 다음, 반환된 키를 로컬 Vault에 저장하고 `.env`를 생성해 연결을 테스트하며, MCP로도 노출합니다.

![baipiao product demo](./docs/assets/product-demo-english.gif)

## Why It Exists

무료 티어만으로도 LLM API, 데이터베이스, 오브젝트 스토리지, 호스팅, 인증, 이메일, 모니터링, 벡터 데이터베이스까지 상당히 멀리 갈 수 있습니다.

문제는 서비스가 없어서가 아니라 운영상의 마찰입니다.

각 서비스마다 다른 콘솔, API 키 페이지, 할당량 모델, 온보딩 흐름, 환경 변수 형식, 보안 관행이 있습니다. AI 코딩 에이전트는 도움이 되지만, 구조화된 작업과 안전한 경계, 결과를 돌려받을 장소가 필요합니다.

baipiao는 그 제어면입니다.

## The Loop

![baipiao agent setup loop](./docs/assets/agent-setup-loop.svg)

## Product Principles

- **Agent-first, human-approved**: baipiao는 작업을 준비하고, 로그인/검증/민감 작업은 사용자가 제어합니다.
- **Local by default**: 비밀 정보는 호스티드 대시보드가 아니라 로컬 자격 증명 저장소에 보관합니다.
- **Prompt to production**: 생성된 프롬프트는 메모가 아니라 에이전트를 위한 실행 가능한 설정 지침입니다.
- **Structured where it matters**: 알려진 서비스에는 검증, env 생성, 연결 테스트, 더 안전한 상태 표시를 제공합니다.
- **MCP-native**: Codex, Claude Code, Cursor 등 MCP 클라이언트는 비밀 값을 받지 않고 baipiao를 호출할 수 있습니다.

## What It Does

| Capability | Description |
|---|---|
| Service catalog | AI, 백엔드, 호스팅, 스토리지, 인증 등 무료 개발자 서비스를 검색합니다. |
| Full catalog localization | 후보를 키워드/카테고리로 검색하고 zh-CN / ja / ko / fr / es 번역을 반영합니다. |
| Agent setup prompts | 서비스별 브라우저 설정 지침을 생성합니다. |
| Agent output parser | `KEY=VALUE` 출력을 받아 설정을 정규화합니다. |
| Local Vault | API 키, 토큰, 엔드포인트, Project ID, 연결 문자열을 OS 자격 증명 저장소에 저장합니다. |
| Env generation | 저장된 설정으로 `.env.local` 및 `.env.example`을 생성합니다. |
| Connection tests | 지원 서비스가 실제 사용 전에 정상인지 확인합니다. |
| MCP server | 안전한 setup / registry / Vault / env / test / status 도구를 제공합니다. |

## Quick Start

```bash
npm i -g baipiao
```

또는 직접 실행:

```bash
npx baipiao init
```

로컬 체크아웃에서 글로벌 `baipiao` 바이너리가 아직 없다면 빌드된 CLI 엔트리포인트를 사용하세요:

```bash
pnpm build
node packages/cli/dist/index.js init
```

그 다음:

```bash
baipiao init
baipiao search llm
baipiao search openruter
baipiao search 데이터베이스
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
baipiao status
```

## CLI Preview

![baipiao CLI preview](./docs/assets/cli-four-panel-preview.png)

## MCP 연동

MCP를 통해 Codex, Claude Code, Cursor 같은 Agent 클라이언트는 가져온 전체 free-for-dev 카탈로그를 검색하고, 로컬라이즈된 후보를 확인하고, 설정 프롬프트를 생성하고, 안전한 프로젝트 상태를 읽을 수 있습니다. 원문 비밀 값은 반환하지 않습니다.

![baipiao MCP 연동 예시](./docs/assets/mcp-integration-zh.png)

## Example Flow

```bash
baipiao search llm
```

```text
Groq              configurable / testable
OpenRouter        configurable / testable
Gemini            configurable / testable
Hugging Face      prompt-ready
Together AI       prompt-ready
```

설정 프롬프트 생성:

```bash
baipiao setup groq
```

baipiao는 서비스 전용 프롬프트를 에이전트에게 전달합니다. 에이전트가 웹 설정을 완료한 후 다음과 같은 값을 반환합니다:

```env
GROQ_API_KEY=gsk_xxx
```

이후 baipiao가 검증, 저장, 기록, 테스트를 수행합니다:

```text
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
✓ Connection test passed
```

## Vault

baipiao는 비밀 정보를 클립보드의 임시 데이터가 아니라 제품 인프라로 취급합니다.

```bash
baipiao vault list
baipiao vault set GROQ_API_KEY
baipiao vault import
baipiao vault copy GROQ_API_KEY
baipiao vault reveal GROQ_API_KEY
baipiao vault health
```

기본 저장 위치:

| Platform | Store |
|---|---|
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Secret Service |

안전 규칙:

- `vault list`는 원문 비밀 값을 출력하지 않습니다.
- `vault copy`는 터미널이 아니라 클립보드를 사용합니다.
- `vault reveal`은 명시적 확인이 필요합니다.
- MCP 도구는 원문 비밀 노출을 제공하지 않습니다.
- 로그와 상태 출력은 키 유출을 피하도록 설계되어 있습니다.

## MCP

MCP 서버 시작:

```bash
baipiao mcp
```

클라이언트에 설치:

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

클라이언트 설정 예시:

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

사용 가능한 MCP 도구 묶음:

```text
services
full catalog
setup prompts
agent output parsing
vault management
env generation
connection testing
project status
stack recommendation
```

MCP는 `vault_reveal`, `get_secret_value`, 브라우저 제어, shell 실행, 비밀 업로드 같은 도구를 의도적으로 제공하지 않습니다.

## Boundaries

baipiao는 다음을 하지 않습니다:

- 웹 로그인 비밀번호 저장
- CAPTCHA / 2FA / 전화 인증 / 제공자 리스크 체크 우회
- 계정 자동 등록
- Billing, Upgrade, Payment, Subscribe, 유료 플랜 액션 클릭
- 비밀 정보를 원격 baipiao 서비스에 업로드

## Disclaimer

baipiao는 독립적인 개발자 도구이며, 참조하는 제3자 서비스와 제휴 관계가 아닙니다. 무료 티어 가용성, 할당량, 가격, API 동작, 제공자 약관은 언제든 바뀔 수 있습니다.

각 서비스의 약관을 확인하고, 자신의 인증 정보를 보호하고, 에이전트에 허용할 작업을 스스로 결정해야 합니다. baipiao는 설정 워크플로우를 구조화하지만 서비스 가용성, 무료 사용, 보안 적합성, 법적 적합성을 보장하지 않습니다.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm docs:dev
```

Project docs:

- [Documentation index](./docs/INDEX.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API / Vault / MCP](./docs/API_AND_VAULT.md)
- [Data sources, normalization, prompts, and MCP flow](./docs/DATA_SOURCES_AND_PROMPTS.md)
- [Website and docs design](./docs/WEBSITE_AND_DOCS.md)

## License

MIT

## Acknowledgements

baipiao의 전체 무료 서비스 후보 카탈로그는 free-for-dev를 참고하고 그 데이터에서 파생되었습니다.
