---
translationStatus: translated
---
# クイックスタート

`baipiao`は、無料の開発者向けサービスを設定するための **Prompt-first / MCP-first** CLI です。無料枠のサービスを検出し、AI コーディングエージェント向けの安全なセットアップ用プロンプトを生成し、エージェントの出力を収集し、ローカルの Vault にキーを保存し、`.env` ファイルを生成し、接続確認を実施し、MCP 経由で AI ツールに機能を公開することができます。

## まずはここから

```bash
npm install -g baipiao
baipiao init --name my-ai-tool
baipiao search llm
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
```

完全な無料カタログを利用する場合:

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog candidates --locale zh-CN
```

MCP をセットアップするには:

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

## 30 秒で理解する

`baipiao`は単なるキー保存スクリプトではありません。「無料サービスを見つけ、エージェントに設定を依頼し、安全に結果を取り込む」という流れを、以下の安定したワークフローに分離しています。

| 必要な内容 | エントリポイント | 結果 |
|---|---|---|
| 厳選済みの無料サービスを見つける | `baipiao search llm` | 設定・テスト対応のサービスを確認 |
| 無料サービス候補を全件検索 | `baipiao catalog candidates --query openrouter` | `free-for-dev` の完全候補を検索 |
| ロケール別に候補を読む | `baipiao catalog candidates --locale zh-CN` | 英語をフォールバックしたローカライズ済み項目 |
| サービスの設定をエージェントに依頼する | `baipiao setup groq` | 安全なセットアッププロンプトとエージェント出力の取り込み |
| キーと env ファイルを管理する | `baipiao vault list` / `baipiao env generate` | Vault 保存と `.env.local` の生成 |
| エージェント向けに公開する | `baipiao mcp` | 同等の機能を MCP ツールとして公開 |

コアのパイプラインは次のとおりです。

```text
サービス検出 → プロンプト生成 → エージェント実行 → 出力パース → Vault 保存 → env 生成 → 接続テスト → MCP 公開
```

アカウント登録を自動化したり、ブラウザを直接操作したり、Web ログインのパスワードを保存したりすることはありません。ログイン、CAPTCHA、2FA、課金が必要な操作は人が実行します。

## 前提条件

- **Node.js >= 20**
- **pnpm**（パッケージマネージャ）
- ターミナル（macOS Terminal / iTerm2 / Windows Terminal / Linux shell）
- MCP 対応 AI コーディングツール（任意）: Cursor / Claude Code / Codex

## インストール

```bash
# npm からグローバルインストール
npm install -g baipiao

# バージョン確認
baipiao --version
```

## 3 つの利用パス

行いたい作業に合わせて選択してください。

| パス | エントリ | 目的 |
|---|---|---|
| **構造化サービス設定** | `search` / `info` / `setup` | Groq、OpenRouter、Supabase など既知サービスを設定 |
| **完全無料カタログ** | `catalog candidates` | 言語、カテゴリ、キーワードで `free-for-dev` 候補を検索 |
| **エージェント連携** | `mcp` | Cursor / Claude Code / Codex がサービス、プロンプト、Vault、env、テスト機能を呼び出せるようにする |

多くのプロジェクトは、まず構造化設定から始め、追加の無料候補が必要な場合に `catalog` を使い、エージェントがプロジェクトやサービス状態を継続参照する必要がある場合に MCP を有効化します。

## 最初のサービスへ 5 ステップ

例として **Groq**（無料 LLM API）を使います。

### ステップ1: プロジェクトを初期化する

```bash
baipiao init --name my-ai-tool
```

`project.json`、`services.json`、`.env.local`、`.env.example` を含む `.baipiao/` を作成します。

### ステップ2: 検索して確認する

```bash
# 無料 LLM サービスを検索
baipiao search llm

# Groq を確認（必要な env キー、無料枠上限、リスクメモ）
baipiao info groq
```

`search` の出力例:

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

### ステップ3: エージェント用セットアッププロンプトを生成する

```bash
baipiao prompt groq --copy
```

`--copy` はプロンプトをクリップボードにコピーします。プロンプトには次が含まれます。
- 対象ページ URL（例: `https://console.groq.com/keys`）
- ステップ形式の指示（API キーの作成、命名規則）
- **安全上の境界**（課金ページのクリック禁止、パスワード入力禁止、CAPTCHA 回避禁止）
- 想定出力形式（`GROQ_API_KEY=...`）

プロンプトをエージェント（Cursor / Claude Code / Codex）に貼り付けます。エージェントがブラウザ作業を行い、結果を返します。

### ステップ4: 出力を解析して保存する

```bash
baipiao setup groq
```

エージェントの出力を貼り付けます。

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

`setup` は次を自動実行します: `KEY=VALUE` を解析 → 形式検証 → Vault へ保存 → `.env.local` の書き込み → 接続テスト → サービス状態の更新。

### ステップ5: 検証する

```bash
# プロジェクト全体の状態を確認
baipiao status

# Groq 接続をテスト
baipiao test groq

# 全 Vault キーを一覧表示（平文は非表示）
baipiao vault list
```

## 完全なコマンド一覧

### プロジェクト初期化

- `baipiao init [--name <name>]` — `.baipiao` プロジェクトの雛形を作成

### サービス探索

- `baipiao search <query>` — キーワードまたはカテゴリ（`llm`、`database`、`storage`）で無料サービスを検索
- `baipiao info <service>` — サービスのメタデータ、env フィールド、無料枠、リスクを確認

### 完全無料カタログ

- `baipiao catalog candidates` — `free-for-dev` の候補をすべて表示
- `baipiao catalog candidates --query openrouter` — 入力語で候補を検索
- `baipiao catalog candidates --category llm` — 正規化カテゴリでフィルタ
- `baipiao catalog candidates --locale zh-CN` — 指定ロケールの候補フィールドを返す
- `baipiao catalog categories` — 候補カテゴリ件数を表示
- `baipiao catalog translation-batch --locale ja` — 翻訳用エントリをエクスポート
- `baipiao catalog localize --locale ja --input translations.ja.json` — オフライン翻訳結果をインポート

### プロンプト生成

- `baipiao prompt <service> [--copy]` — 安全なエージェント設定プロンプトを生成

### 設定

- `baipiao setup <service>` — 対話型の完全設定フロー
- `baipiao output <service>` — 外部出力から設定をインポート

### Vault

- `baipiao vault` — Vault 概要
- `baipiao vault list` — 全キー状態を表示（平文なし）
- `baipiao vault set <KEY>` — 単一キーを手動保存
- `baipiao vault import` — `KEY=VALUE` を一括インポート
- `baipiao vault copy <KEY>` — キーをクリップボードにコピー
- `baipiao vault remove <KEY>` — キーを削除
- `baipiao vault health` — 保存キーの健全性チェック

### env 管理

- `baipiao env generate` — Vault から `.env.local` を作成
- `baipiao env generate --example` — `.env.example` を作成（キー名のみ）

### テスト & ステータス

- `baipiao test [service]` — サービス接続をテスト（OpenAI 互換 / HTTP / Supabase / S3 対応）
- `baipiao status` — プロジェクト全体の状態要約

### スタック推奨

- `baipiao stack recommend <type>` — プロジェクト種別に応じた無料スタックを提案
  - `type`: `ai_saas` / `rag` / `blog` / `agent_tool` / `mobile_app` / `custom`
- `baipiao setup-stack <type>` — スタック内のすべてのサービス向けに一括でセットアッププロンプトを生成

### MCP 統合

- `baipiao mcp` — MCP stdio サーバーを起動
- `baipiao mcp install <cursor|claude|codex>` — MCP クライアント設定を出力

## サービスの機能レベル

`baipiao` の各サービスは機能タグを持ちます。

| タグ | 意味 |
|---|---|
| `prompt` | エージェント向けのセットアッププロンプトを生成可能 |
| `config` | 構造化 env キーを検証・永続化可能 |
| `test` | 接続テストを自動実行可能 |

すべてのサービスは最低限 `prompt` をサポートします。構造化設定対応サービスは `config` と `test` も追加でサポートします。

## プロジェクト種別ごとの推奨スタック

`baipiao stack recommend` の出力に基づく例:

**AI SaaS（`ai_saas`）**

```text
LLM       → groq / openrouter
Database  → supabase
Storage   → cloudflare-r2
Auth      → clerk
Email     → resend
```

**RAG（`rag`）**

```text
LLM       → groq / gemini
Vector DB → supabase (pgvector)
Storage   → cloudflare-r2
```

## セキュリティモデル

`baipiao` は「秘密情報が流出しない」ことを基本原則に設計されています。

- **Vault** はシステムのキーチェーンに秘密鍵を保存します（macOS Keychain / Windows Credential Manager / Linux Secret Service）
- すべてのログおよびステータス出力は **自動的に改行なしで伏字化** され、端末に平文秘密が表示されません
- MCP は危険なエンドポイントを公開しません: `vault_reveal`、`get_secret_value` など

- 生成されるすべてのプロンプトには必須の安全境界が含まれます: Billing/Upgrade クリック禁止、CAPTCHA 迂回禁止、パスワード保存禁止
- `.env.example` はキー名のみを含み、値は含みません

## アーキテクチャ概要

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

## 次のステップ

- 完全な CLI コマンドリファレンス → [CLI ドキュメント](/docs/ja/cli)
- MCP のツール契約とセキュリティ境界 → [MCP ドキュメント](/docs/ja/mcp)
