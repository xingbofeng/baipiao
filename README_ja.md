# baipiao

**開発者向けの Agent-native 無料スタック設定ツール。**

![Agent Native](https://img.shields.io/badge/agent--native-111827?style=flat-square)
![MCP Ready](https://img.shields.io/badge/MCP-ready-2563eb?style=flat-square)
![Local Vault](https://img.shields.io/badge/local--vault-secure-16a34a?style=flat-square)
![Free Stack](https://img.shields.io/badge/free--stack-configurator-7c3aed?style=flat-square)

[Website](https://baipiao.counterxing.top) · [Documentation](https://baipiao.counterxing.top/docs/ja) · [English](./README.md) · [中文](./README_zh.md) · [日本語](./README_ja.md) · [한국어](./README_ko.md) · [Français](./README_fr.md) · [Español](./README_es.md)

baipiao は、無料の開発者向けインフラを整理し、エージェントと協働しながら安全に設定を進めるためのツールです。

無料サービスを見つけ、正確なセットアップ用プロンプトを生成して Codex / Claude Code / Cursor に渡し、返ってきたキーをローカル Vault に保存し、`.env` を生成して接続をテストし、MCP 経由でも公開します。

![baipiao product demo](./docs/assets/product-demo-english.gif)

## Why It Exists

無料枠だけでも、LLM API、データベース、オブジェクトストレージ、ホスティング、認証、メール、監視、ベクターデータベースなどでかなり遠くまで進めます。

問題は「サービスがない」ことではなく、運用上の摩擦です。

各サービスには異なるコンソール、API キーページ、クォータ、導入フロー、環境変数形式、セキュリティ慣習があります。AI コーディングエージェントは役立ちますが、構造化されたタスク、安全な境界、そして結果を返す場所が必要です。

baipiao はその制御面です。

## The Loop

![baipiao agent setup loop](./docs/assets/agent-setup-loop.svg)

## Product Principles

- **Agent-first, human-approved**: baipiao は作業を準備しますが、ログイン、確認、敏感な操作はユーザーが管理します。
- **Local by default**: 秘密情報はホスト型ダッシュボードではなく、ローカルの資格情報ストアに保存します。
- **Prompt to production**: 生成されたプロンプトはメモではなく、エージェント向けの実行可能なセットアップ指示です。
- **Structured where it matters**: 既知のサービスには検証、env 生成、接続テスト、より安全なステータス表示を提供します。
- **MCP-native**: Codex、Claude Code、Cursor などの MCP クライアントは、秘密値を受け取らずに baipiao を呼び出せます。

## What It Does

| Capability | Description |
|---|---|
| Service catalog | AI、バックエンド、ホスティング、ストレージ、認証などの無料開発者サービスを検索します。 |
| Full catalog localization | 候補をキーワード/カテゴリで検索し、zh-CN / ja / ko / fr / es の翻訳を取り込みます。 |
| Agent setup prompts | サービスごとのブラウザセットアップ手順を生成します。 |
| Agent output parser | `KEY=VALUE` の出力を受け取り、設定を正規化します。 |
| Local Vault | API キー、トークン、エンドポイント、Project ID、接続文字列を OS の資格情報ストアに保存します。 |
| Env generation | 保存済み設定から `.env.local` と `.env.example` を生成します。 |
| Connection tests | サポート済みサービスを本番投入前に検証します。 |
| MCP server | 安全な setup / registry / Vault / env / test / status ツールを公開します。 |

## Quick Start

```bash
npm i -g baipiao
```

または直接起動します:

```bash
npx baipiao init
```

ローカルチェックアウトでグローバル `baipiao` バイナリがまだない場合は、ビルド済み CLI エントリポイントを使えます:

```bash
pnpm build
node packages/cli/dist/index.js init
```

その後は:

```bash
baipiao init
baipiao search llm
baipiao search openruter
baipiao search 数据庫
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
baipiao status
```

## CLI Preview

![baipiao CLI preview](./docs/assets/cli-four-panel-preview.png)

## MCP 連携

MCP を通じて、Codex、Claude Code、Cursor などの Agent クライアントは、取り込まれた free-for-dev 全量カタログの検索、ローカライズ済み候補の確認、セットアッププロンプトの生成、安全なプロジェクト状態の取得を行えます。生の秘密値は返しません。

![baipiao MCP 連携例](./docs/assets/mcp-integration-zh.png)

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

セットアップ用プロンプトを生成します:

```bash
baipiao setup groq
```

baipiao はサービス専用のプロンプトをエージェントに渡します。エージェントが Web 設定を終えると、次のような結果を返します:

```env
GROQ_API_KEY=gsk_xxx
```

その後 baipiao が検証、保存、書き込み、テストを行います:

```text
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
✓ Connection test passed
```

## Vault

baipiao は秘密情報をクリップボードの一時データではなく、製品インフラとして扱います。

```bash
baipiao vault list
baipiao vault set GROQ_API_KEY
baipiao vault import
baipiao vault copy GROQ_API_KEY
baipiao vault reveal GROQ_API_KEY
baipiao vault health
```

デフォルトの保存先:

| Platform | Store |
|---|---|
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Secret Service |

安全ルール:

- `vault list` は生の秘密値を表示しません。
- `vault copy` はターミナル出力ではなくクリップボードを使います。
- `vault reveal` は明示的な確認が必要です。
- MCP ツールは生の秘密値の公開を行いません。
- ログと生成される状態出力は、キー漏えいを避けるよう設計されています。

## MCP

MCP サーバーを起動します:

```bash
baipiao mcp
```

クライアントへインストールします:

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

クライアント設定例:

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

利用可能な MCP ツール群:

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

MCP は `vault_reveal`、`get_secret_value`、ブラウザ制御、shell 実行、秘密アップロードなどのツールを意図的に提供しません。

## Boundaries

baipiao は次のことを行いません:

- Web ログインパスワードを保存しない。
- CAPTCHA、2FA、電話認証、提供元のリスクチェックを回避しない。
- アカウントの自動登録をしない。
- Billing、Upgrade、Payment、Subscribe、課金プラン操作をクリックしない。
- 秘密情報を遠隔の baipiao サービスへアップロードしない。

## Disclaimer

baipiao は独立した開発者向けツールであり、参照する第三者サービスとは提携していません。無料枠の可用性、クォータ、価格、API の挙動、提供元の利用規約はいつでも変わる可能性があります。

各サービスの規約を確認し、自分の認証情報を守り、エージェントに許可する操作を決める責任はあなたにあります。baipiao は設定ワークフローを整理しますが、サービスの可用性、無料利用、セキュリティ適合性、法的妥当性を保証するものではありません。

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

baipiao の全量無料サービス候補カタログは free-for-dev を参考にし、そのデータから派生しています。
