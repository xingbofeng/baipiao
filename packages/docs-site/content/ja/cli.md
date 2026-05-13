---
translationStatus: translated
---
# CLI

`baipiao` コマンドラインインターフェースです。各コマンドは単独で実行でき、必要に応じてフル設定パイプラインとして接続できます。

## まずここから

最初のサービスをインストールして設定します。

```bash
# CLI をインストール
npm install -g baipiao

# 現在のプロジェクトを初期化
baipiao init --name my-ai-tool

# 無料 LLM サービスを検索
baipiao search llm

# セットアッププロンプトを生成し、Agent の出力を受け取る
baipiao setup groq

# Vault から .env.local を生成
baipiao env generate

# Groq 接続をテスト
baipiao test groq
```

全件無料カタログを検索:

```bash
# キーワードで候補カタログを全件検索
baipiao catalog candidates --query openrouter

# 正規化カテゴリでフィルタ
baipiao catalog candidates --category llm

# 指定ロケールで候補フィールドを取得
baipiao catalog candidates --locale zh-CN
```

## init

```text
baipiao init [--name <name>]
```

プロジェクトコンテキストを初期化します。`.baipiao/` のディレクトリスケルトンを作成します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `--name` | `<string>` | プロジェクト名。スラグとしても使われます。省略した場合は現在のディレクトリ名を使用します。 |

**出力**

```text
✓ Initialized baipiao in /home/user/my-ai-tool
  Created .baipiao/project.json
  Created .baipiao/services.json
  Created .env.local
  Created .env.example
```

すでに初期化済みの場合:

```text
⚠ Project already initialized at /home/user/my-ai-tool
```

**例**

```bash
baipiao init
baipiao init --name my-ai-tool
```

## search

```text
baipiao search <query>
```

全量 `free-for-dev` カタログをキーワードまたはカテゴリで検索します。あいまい検索と多言語キーワードに対応します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<query>` | `string` | 検索キーワード。カテゴリ名、サービス名、近いスペル、多言語キーワードを受け付けます。 |

**出力**

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

機能タグ:

| タグ | 意味 |
| --- | --- |
| `prompt` | エージェントの設定プロンプトを生成できます |
| `config` | 構造化された env キーの検証と永続化が可能 |
| `test` | 接続テストを自動実行できます |

**例**

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

`free-for-dev` の候補全体検索とオフラインローカライズワークフロー。`candidates` はキーワード・カテゴリでのフィルタ付きで正規化された全カタログを返し、`categories` はカテゴリ件数を返し、`translation-batch` は翻訳用フィールドをエクスポートし、`localize` は翻訳を `enrichment.localization` に戻します。

対応ロケール:

| ロケール | 意味 |
| --- | --- |
| `en` | 英語（ソース） |
| `zh-CN` | 簡体字中国語 |
| `ja` | 日本語 |
| `ko` | 韓国語 |
| `fr` | フランス語 |
| `es` | スペイン語 |

**例**

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

サービスメタデータ（リンク、env フィールド、無料枠、リスクノート）を表示します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<service>` | `string` | サービス ID またはスラグ（例: `groq`、`openrouter`、`supabase`） |

**出力**

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
  • レート制限はモデルごとに適用されます
  • 本番利用前に現在の無料枠の利用可能状況を確認してください
```

**例**

```bash
baipiao info groq
baipiao info supabase
```

## prompt

```text
baipiao prompt <service> [--copy]
```

安全なエージェント設定プロンプトを生成します。構造化サービス（YAML 設定あり）は正確なプロンプトを生成し、非構造化サービスは汎用テンプレートを使用します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<service>` | `string` | サービス ID またはスラグ |
| `--copy` | `boolean` | 生成されたプロンプトをシステムクリップボードにコピーします |

**出力**（構造化サービスの例: Groq）

```text
あなたは私のブラウザ設定アシスタントです。

目的:
Groq の無料枠リソースの設定と、必要な
API キーの作成を手伝ってください。

入口ページ:
https://console.groq.com/keys

手順:
1. If not logged in, pause and ask me to complete login, CAPTCHA,
   email verification, or 2FA.
2. Create a new API key.
3. Use the name baipiao-${project_slug}.
4. Copy the generated API key.

安全ルール:
• Do not ask for or store my web login password.
• Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
• Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
• Do not enable any paid feature.

完了したら次の1行だけを出力してください:
GROQ_API_KEY=...
```

**例**

```bash
baipiao prompt groq
baipiao prompt groq --copy
baipiao prompt huggingface # huggingface.co の無料カタログ候補に解決
```

## setup

```text
baipiao setup <service>
```

対話型の完全設定フロー: プロンプト生成 → Agent 出力待機 → 解析 → 検証 → 永続化 → env 書き込み → テスト。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<service>` | `string` | サービス ID またはスラグ |

**対話フロー**

```text
$ baipiao setup groq

→ Generating setup prompt for Groq...
✓ プロンプトをクリップボードにコピーしました

Paste the Agent's output below (end with an empty line):
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

✓ Parsed 1 entry
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
→ Running connection test...
✓ Connection test passed (latency: 234ms)

ステータス: tested
```

**状態遷移**

```text
not_started → prompt_generated → agent_output_received
  → configured_unverified → configured → tested
```

**例**

```bash
baipiao setup groq
baipiao setup supabase
```

## output

```text
baipiao output <service> [--input <text>]
```

`setup` と同じエントリポイントです。外部ソースから Agent 出力をインポートします。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<service>` | `string` | サービス ID またはスラグ |
| `--input` | `<string>` | 対話式貼り付けをスキップして KEY=VALUE テキストを直接渡す |

**対応入力形式**

- Env 形式: `KEY=VALUE`
- フェンス付きコードブロック:
  ````text
  ```env
  GROQ_API_KEY=gsk_xxx
  ```
  ````
- コロン形式: `API Key: abc`、`Endpoint: https://example.com`

**例**

```bash
baipiao output groq
baipiao output groq --input "GROQ_API_KEY=gsk_xxx"
```

## env generate

```text
baipiao env generate [--example] [--include-unverified]
```

Vault に保存された設定を読み取り、環境変数ファイルを書き込みます。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `--example` | `boolean` | `.env.example` を作成します（キー名のみ、値は含まれません） |
| `--include-unverified` | `boolean` | 未検証の設定も、リスク警告付きで含めます |

**出力**

```text
$ baipiao env generate
✓ .env.local written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

$ baipiao env generate --example
✓ .env.example written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
```

**例**

```bash
baipiao env generate
baipiao env generate --example
baipiao env generate --include-unverified
```

## test

```text
baipiao test [<service>]
```

サービス接続をテストします。サービスを指定しない場合は、現在のプロジェクトで追跡中のサービスをすべてテストします。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<service>` | `string` | オプション。サービス ID またはスラグ |

**出力**

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

**サポートするテストタイプ**

| 種類 | 説明 |
| --- | --- |
| `openai_compatible_chat` | チャット補完リクエストを送信して API キーを検証します（Groq、OpenRouter） |
| `http` | HTTP GET/POST 検証（Gemini） |
| `supabase` | Supabase URL + Anon Key を検証 |
| `s3_compatible` | S3 互換ストレージの接続性を検証（Cloudflare R2） |

**例**

```bash
baipiao test
baipiao test groq
baipiao test supabase
```

## status

```text
baipiao status
```

現在のプロジェクトの全体状態要約を表示します。

**出力**

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

**例**

```bash
baipiao status
```

## stack recommend

```text
baipiao stack recommend <type>
```

プロジェクト種別ごとに無料技術スタックを推奨します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | プロジェクトタイプ |

**出力**

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

**例**

```bash
baipiao stack recommend ai_saas
baipiao stack recommend rag
baipiao stack recommend blog
```

## setup-stack

```text
baipiao setup-stack <type>
```

推奨スタック内の各サービス向けにセットアッププロンプトのセクションを出力します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | プロジェクトタイプ |

**例**

```bash
baipiao setup-stack ai_saas
```

## vault

```text
baipiao vault [<subcommand>]
```

統一されたシークレット管理センター。サブコマンドなしで Vault 概要を開きます。

**サブコマンド**

### vault list

```text
baipiao vault list [--service <service>]
```

全キー状態を一覧表示します。平文は表示されません。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `--service` | `<string>` | 任意。サービス別にフィルタ |

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

単一シークレットを手動保存します。入力は非表示です（エコーされません）。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<KEY>` | `string` | 環境変数キー名 |
| `--service` | `<string>` | 任意。関連するサービス ID |

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

KEY=VALUE テキストを一括インポートします。解析、検証、保存を自動実行します。

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

指定したキーの値をクリップボードにコピーします。端末には一切表示されません。

```text
$ baipiao vault copy GROQ_API_KEY
✓ GROQ_API_KEY copied to clipboard
✓ Clipboard will be cleared in 30 seconds
```

### vault reveal

```text
baipiao vault reveal <KEY>
```

指定キーの平文値を端末に表示します。**明示的な確認が必要です。** MCP では公開されません。

```text
$ baipiao vault reveal GROQ_API_KEY
This will print the secret value in your terminal. Continue? y/N
```

### vault remove

```text
baipiao vault remove <KEY>
```

システムの資格情報ストアから指定キーを削除します。

```text
$ baipiao vault remove GROQ_API_KEY
✓ GROQ_API_KEY removed from Vault
⚠ This key still appears in .env.local. Remove it? y/N
```

### vault health

```text
baipiao vault health
```

保存されたすべてのキーの状態と形式有効性を確認します。

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

AI コーディングツール用の MCP stdio サーバーを開始します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `--dry-run` | `boolean` | 実サーバーを起動せず、準備完了状態だけを確認 |

**例**

```bash
baipiao mcp
baipiao mcp --dry-run
```

## mcp install

```text
baipiao mcp install <client> [--port <port>]
```

baipiao を対象 MCP クライアントにインストールします。必要なクライアント設定を直接更新します。

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `<client>` | `cursor \| claude \| codex` | 対象 AI コーディングツール |
| `--port` | `<number>` | `http://127.0.0.1:<port>/mcp` を指す HTTP クライアント設定をインストール |

**手動設定 map**（stdio モード）

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

**手動設定 map**（HTTP モード）

```json
{
  "mcpServers": {
    "baipiao": {
      "url": "http://127.0.0.1:7331/mcp"
    }
  }
}
```

> `baipiao mcp --port 7331` で HTTP サーバーを起動し、`baipiao mcp install <client> --port 7331` で一致するクライアント設定をインストールします。

**例**

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex --port 7331
```

## セキュリティの期待値

- 課金、アップグレード、サブスクリプションのクリックを自動化しません
- Web ログインパスワードを保存しません
- CAPTCHA、2FA、電話認証、プラットフォームのリスクチェックの迂回を行いません
- `vault list` は平文を出力しません。`vault copy` は端末出力の代わりにクリップボードを使用します
- MCP は `vault_reveal`、`get_secret_value`、`shell_exec`、`browser_click`、同様の危険なエンドポイントを公開しません
- ログおよびステータス出力は既定で伏字化されます
