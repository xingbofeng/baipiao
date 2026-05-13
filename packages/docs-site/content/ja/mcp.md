---
translationStatus: translated
---
# MCP

MCP は、外部 AI コーディングツール（Claude Code、Cursor、Codex）に対して `baipiao` の中核機能を公開するためのプロトコル層です。すべてのツールは allowlist 方式で動作し、危険な操作は明示的にブロックされます。

## 開始方法

CLI をインストールし、baipiao を MCP クライアントに登録します。

```bash
# CLI をインストール
npm install -g baipiao

# Cursor 用 MCP 設定をインストール
baipiao mcp install cursor

# Claude Code 用 MCP 設定をインストール
baipiao mcp install claude

# Codex 用 MCP 設定をインストール
baipiao mcp install codex
```

コピー可能な手動設定 map:

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

よく使う MCP 呼び出し例:

```text
# デフォルト検索は全量 free-for-dev カタログを使い、あいまい検索に対応
mcp: list_services { "query": "openruter", "limit": 20 }

# 言語、ページング、sourceCategory が必要な場合
mcp: list_free_catalog_candidates { "query": "openrouter", "locale": "zh-CN", "limit": 20 }

# サービスのセットアッププロンプトを生成
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

# 現在のプロジェクト状態を取得
mcp: get_status {}
```

## サーバー起動

```bash
baipiao mcp                # stdio モード（デフォルト）
baipiao mcp --dry-run      # 準備状態チェックのみ
baipiao mcp --port 7331    # ローカル HTTP MCP サーバー
baipiao mcp install cursor # クライアント設定をインストール
```

## プロトコル互換性

MCP サーバーは、現在のクライアントで使われる標準 JSON-RPC ライフサイクルに対応しています。

- `initialize` は、合意された protocol version、tools capability、`baipiao-mcp` server info を返します。
- `notifications/initialized` とその他の notification は受け入れられ、JSON-RPC error response は返しません。
- `ping` は空の成功結果を返します。
- HTTP モードでは、notification のみのリクエストは JSON-RPC error payload ではなく、空 body の `202` を返します。

## セキュリティ宣言

**MCP では次の項目を公開していません。**

`vault_reveal`、`get_secret_value`、`browser_click`、`browser_type`、`shell_exec`、`read_any_file`、`write_any_file`、`delete_file`、`upload_secret`

これは以下を意味します。
- Vault の平文値は外部モデルに返されません
- 任意ファイルの読み取り・書き込みは許可されません
- 任意のシェル実行やブラウザ実行も許可されません

**ツールアノテーションの凡例**

| 注釈 | 意味 |
| --- | --- |
| 🔒 `readOnly` | 読み取り専用。状態を変更しません |
| ⚡ `idempotent` | 冪等。安全に繰り返し実行できます |
| ⚠️ `destructive` | データを変更または削除します |

---

## list_services

全量 `free-for-dev` カタログを、キーワード、カテゴリ、機能で検索します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `query` | `string` | いいえ | 検索キーワードまたはカテゴリ名 |
| `category` | `string` | いいえ | カテゴリでフィルタ |
| `capability` | `"prompt" \| "config" \| "test"` | いいえ | 機能タグでフィルタ |
| `limit` | `number` | いいえ | 返却する最大件数 |

**出力**

```json
{
  "services": [
    {
      "id": "groq",
      "name": "Groq",
      "category": "llm",
      "capability": ["prompt", "config", "test"],
      "freeTier": "対応モデルに対してレート制限付きの無料枠があります。"
    },
    {
      "id": "huggingface",
      "name": "Hugging Face",
      "category": "llm",
      "capability": ["prompt"],
      "freeTier": "レート制限付きの無料推論 API があります。"
    }
  ]
}
```

## list_free_catalog_candidates

キーワード、カテゴリ、ソースカテゴリ、ロケール、件数、オフセットで `free-for-dev` カタログ全体を返します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `query` | `string` | いいえ | 検索キーワード |
| `category` | `string` | いいえ | 正規化カテゴリでフィルタ |
| `sourceCategory` | `string` | いいえ | 上流 Markdown セクションでフィルタ |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | いいえ | 要求する出力ロケール |
| `systemLocale` | `string` | いいえ | ホスト環境からのロケールヒント |
| `limit` | `number` | いいえ | 返却する最大件数 |
| `offset` | `number` | いいえ | ページネーションのオフセット |

**出力**

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

候補カタログ全体のカテゴリおよびソースカテゴリ件数を返します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | いいえ | ラベル表示用ロケールヒント |

## get_free_catalog_translation_batch

指定ロケールの未翻訳候補のソース文言を返します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | はい | 対象ロケール |
| `query` | `string` | いいえ | 検索キーワード |
| `category` | `string` | いいえ | 正規化カテゴリでフィルタ |
| `sourceCategory` | `string` | いいえ | 上流 Markdown セクションでフィルタ |
| `limit` | `number` | いいえ | 返却する最大件数 |
| `offset` | `number` | いいえ | ページネーションのオフセット |
| `untranslatedOnly` | `boolean` | いいえ | 完全にローカライズされていないエントリのみ返す |

## apply_free_catalog_translations

オフライン翻訳を `enrichment.localization` に書き戻します。⚡ `idempotent`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | はい | 対象ロケール |
| `translations` | `array` | はい | 翻訳エントリ。`id`、`name?`、`description?`、`freeTierText?` |

**出力**

```json
{
  "updated": 12,
  "missing": ["free-for-dev:generative-ai:missing-item"]
}
```

## get_service_info

サービスの完全なメタデータを取得します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | はい | サービス ID またはスラグ |

**出力**

```json
{
  "service": {
    "id": "groq",
    "name": "Groq",
    "slug": "groq",
    "category": "llm",
    "description": "無料枠付きの高速 LLM 推論 API です。",
    "urls": {
      "homepage": "https://groq.com",
      "console": "https://console.groq.com",
      "apiKeys": "https://console.groq.com/keys",
      "docs": "https://console.groq.com/docs"
    },
    "freeTier": {
      "summary": "対応モデルに対してレート制限付きの無料枠があります。",
      "requiresCreditCard": false,
      "resetCycle": "daily"
    },
    "env": [
      {
        "key": "GROQ_API_KEY",
        "secret": true,
        "required": true,
        "pattern": "^gsk_[A-Za-z0-9]+$",
        "description": "Groq API キー"
      }
    ],
    "capability": ["prompt", "config", "test"],
    "risks": [
      "レート制限はモデルごとに適用されます",
      "本番利用前に現在の無料枠の利用可能状況を確認してください"
    ]
  }
}
```

## generate_setup_prompt

サービス向けのエージェント設定プロンプトを生成します。構造化サービスは正確なプロンプトを、非構造化サービスは汎用テンプレートを返します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | はい | サービス ID またはスラグ |
| `projectSlug` | `string` | いいえ | プロンプト命名用のプロジェクト識別子 |

**出力**

```json
{
  "serviceId": "groq",
  "serviceName": "Groq",
  "prompt": "あなたは私のブラウザ設定アシスタントです。\n\n目的:\nGroq の無料枠リソースの設定を手伝ってください...\n\n完了したら次の1行だけを出力してください:\nGROQ_API_KEY=...",
  "outputFormat": "GROQ_API_KEY=...",
  "requiredEnvKeys": ["GROQ_API_KEY"],
  "capability": ["prompt", "config", "test"]
}
```

## parse_agent_output

Agent が返したテキストから KEY=VALUE のエントリを解析します。保存は行いません。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `text` | `string` | はい | Agent が返した生テキスト |
| `serviceId` | `string` | いいえ | 形式検証・フィールド対応付けに用いるサービス ID |

**出力**

```json
{
  "entries": [
    { "key": "GROQ_API_KEY", "value": "gsk_xxx", "secret": true }
  ],
  "notes": ["KEY=VALUE 形式から 1 件を解析しました"],
  "warnings": []
}
```

パース失敗:

```json
{
  "entries": [],
  "notes": [],
  "warnings": [
    "3 行目を解析できませんでした: 'some invalid text'"
  ]
}
```

**対応入力形式**

- Env 形式: `KEY=VALUE`
- Markdown のフェンス付きコードブロック
- コロン形式: `API Key: abc`、`Endpoint: https://example.com`

## save_agent_output

Agent 出力を解析して Vault に保存します。⚡ `idempotent`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | はい | サービス ID またはスラグ |
| `text` | `string` | はい | Agent が返した生テキスト |

**出力**

```json
{
  "saved": [
    { "key": "GROQ_API_KEY", "serviceId": "groq", "scope": "server" }
  ],
  "failed": [],
  "state": "configured"
}
```

部分失敗:

```json
{
  "saved": [
    { "key": "SUPABASE_URL", "serviceId": "supabase", "scope": "public" }
  ],
  "failed": [
    {
      "key": "SUPABASE_ANON_KEY",
      "reason": "パターン不一致: 期待値 ^eyJ..."
    }
  ],
  "state": "configured_unverified"
}
```

## validate_secret

単一キー値の形式を検証し、該当するサービスを返します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `key` | `string` | はい | 環境変数キー名 |
| `value` | `string` | はい | 検証対象値 |

**出力**

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

Vault 内のすべてのキーのメタデータを一覧表示します。**平文値は一切返しません。**🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | いいえ | サービスでフィルタ |

**出力**

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

単一シークレットを保存します。値は返されません。⚡ `idempotent`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `key` | `string` | はい | 環境変数キー名 |
| `value` | `string` | はい | 保存する値（返却なし） |
| `serviceId` | `string` | いいえ | 関連サービス ID |

**出力**

```json
{
  "saved": true,
  "key": "GROQ_API_KEY",
  "serviceId": "groq",
  "scope": "server"
}
```

## vault_import

KEY=VALUE を一括インポートし、解析・検証・保存を自動実行します。⚡ `idempotent`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `text` | `string` | はい | 複数行 KEY=VALUE テキスト |
| `serviceId` | `string` | いいえ | 関連サービス ID |

**出力**

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

キー値をクリップボードへコピーします。**値は MCP を通じて返されません。**⚡ `idempotent`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `key` | `string` | はい | コピーするキー名 |

**出力**

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

システムの資格情報ストアからキーを削除します。⚠️ `destructive`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `key` | `string` | はい | 削除するキー名 |

**出力**

```json
{
  "removed": true,
  "key": "GROQ_API_KEY"
}
```

## vault_health

保存されたすべてのキーの健全性をチェックします。🔒 `readOnly`

**入力**

なし

**出力**

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
    "warnings": ["サーバー専用キー: フロントエンドに公開しないでください"]
    },
    {
      "key": "OPENROUTER_API_KEY",
      "status": "missing",
      "formatValid": null,
      "connection": null,
    "warnings": ["Vault にキーが見つかりません"]
    }
  ]
}
```

## generate_env

Vault から環境変数ファイルを生成します。⚠️ `destructive`（ファイルシステムに書き込み）

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `path` | `string` | いいえ | 書き出すファイルパス。デフォルトは `.env.local` |
| `example` | `boolean` | いいえ | `.env.example` を生成する（キー名のみ） |
| `includeUnverified` | `boolean` | いいえ | 未検証の設定項目を含める |

**出力**

```json
{
  "path": ".env.local",
  "writtenKeys": ["GROQ_API_KEY", "GEMINI_API_KEY", "SUPABASE_URL"],
  "missingKeys": ["OPENROUTER_API_KEY"]
}
```

## test_connection

指定サービスの接続テストを実行します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | はい | サービス ID またはスラグ |

**出力**

```json
{
  "serviceId": "groq",
  "ok": true,
  "status": "passed",
  "message": "接続に成功しました",
  "latencyMs": 234
}
```

```json
{
  "serviceId": "huggingface",
  "ok": false,
  "status": "skipped",
  "message": "このサービスは自動テストをサポートしていません",
  "latencyMs": null
}
```

## get_status

現在のプロジェクトのグローバルな状態要約を取得します。🔒 `readOnly`

**入力**

なし

**出力**

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

プロジェクト種別に応じて無料技術スタックを推奨します。🔒 `readOnly`

**入力**

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `useCase` | `"ai_saas" \| "rag" \| "blog" \| "agent_tool" \| "mobile_app" \| "custom"` | はい | プロジェクト種別 |

**出力**

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
      "すべてのサービスが無料枠をサポートしています",
      "まず Groq を設定してください - 他のサービスは認証フローに依存する場合があります"
    ]
  }
}
```

## ツール概要

| ツール | 種別 | 説明 |
| --- | --- | --- |
| `list_services` | 🔒 readOnly | サービスカタログを検索 |
| `get_service_info` | 🔒 readOnly | サービスの詳細を取得 |
| `generate_setup_prompt` | 🔒 readOnly | エージェント設定プロンプトを生成 |
| `parse_agent_output` | 🔒 readOnly | Agent 出力を解析 |
| `save_agent_output` | ⚡ idempotent | Agent 出力を Vault に保存 |
| `validate_secret` | 🔒 readOnly | キー形式を検証 |
| `vault_list` | 🔒 readOnly | Vault メタデータを一覧表示 |
| `vault_set` | ⚡ idempotent | 単一キーを保存 |
| `vault_import` | ⚡ idempotent | 複数キーをインポート |
| `vault_copy` | ⚡ idempotent | キーをクリップボードへコピー |
| `vault_remove` | ⚠️ destructive | キーを削除 |
| `vault_health` | 🔒 readOnly | キーの健全性を確認 |
| `generate_env` | ⚠️ destructive | env ファイルを書き込み |
| `test_connection` | 🔒 readOnly | サービス接続をテスト |
| `get_status` | 🔒 readOnly | プロジェクト状態サマリー |
| `recommend_stack` | 🔒 readOnly | 推奨スタックを表示 |

## インストールオプション

### Cursor

```bash
baipiao mcp install cursor
```

出力:

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

出力:

```json
{
  "client": "claude",
  "transport": "http",
  "url": "http://127.0.0.1:7331/mcp",
  "localOnly": true
}
```

> `baipiao mcp --port 7331` で HTTP サーバーを起動し、`baipiao mcp install <client> --port 7331` で一致するクライアント設定を出力します。

## 使用例

```text
1) LLM サービスを検索
mcp: list_services { "query": "llm", "capability": "config", "limit": 10 }

2) Groq の詳細を取得
mcp: get_service_info { "serviceId": "groq" }

3) セットアッププロンプトを生成
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

4) Agent 出力を保存
mcp: save_agent_output {
  "serviceId": "groq",
  "text": "GROQ_API_KEY=gsk_xxx"
}

5) ステータスを確認
mcp: get_status {}

6) env を生成
mcp: generate_env { "example": false }
```
