---
translationStatus: translated
---
# Démarrage rapide

`baipiao` est un CLI **Prompt-first / MCP-first** pour configurer des services gratuits destinés aux développeurs.  
Il permet de repérer des offres gratuites, de générer des prompts sûrs pour votre agent IA, de récupérer la sortie de l’agent, d’enregistrer les clés dans un Vault local, de générer les fichiers `.env`, de tester la connectivité et d’exposer l’ensemble via MCP.

## Commencer ici

```bash
npm install -g baipiao
baipiao init --name my-ai-tool
baipiao search llm
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
```

Utilisez ceci pour le catalogue gratuit complet :

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog candidates --locale zh-CN
```

Utilisez ces commandes pour MCP :

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

## Comprendre en 30 secondes

`baipiao` n’est pas qu’un script de stockage de clés. Il transforme le cycle  
« trouver un service gratuit, demander à un Agent de le configurer puis intégrer le résultat en toute sécurité » en quelques flux stables :

| Besoin | Point d’entrée | Résultat |
|---|---|---|
| Trouver des services gratuits triés | `baipiao search llm` | Services validés avec capacités de config / test |
| Chercher dans le catalogue complet | `baipiao catalog candidates --query openrouter` | Recherche sur tout `free-for-dev` |
| Afficher dans une langue | `baipiao catalog candidates --locale zh-CN` | Champs localisés avec retour anglais si non traduit |
| Demander une configuration à l’Agent | `baipiao setup groq` | Prompt de configuration sécurisé + capture de sortie Agent |
| Gérer clés et fichiers env | `baipiao vault list` / `baipiao env generate` | Sauvegarde Vault et génération `.env.local` |
| Exposer les fonctions à l’Agent | `baipiao mcp` | Outils MCP avec les mêmes capacités |

Le pipeline principal est :

```text
Découverte des services → Génération du prompt → Exécution Agent → Analyse de sortie → Sauvegarde Vault → Génération env → Test de connexion → Exposition MCP
```

Il n’automatise jamais l’ouverture de compte, ne pilote jamais de navigateur et ne stocke jamais votre mot de passe de connexion web.  
La connexion, CAPTCHA, 2FA et les actions liées à la facturation restent sous contrôle humain.

## Prérequis

- **Node.js >= 20**
- **pnpm** (package manager)
- A terminal (macOS Terminal / iTerm2 / Windows Terminal / Linux shell)
- Un outil IA compatible MCP (optionnel) : Cursor / Claude Code / Codex

## Installation

```bash
# Installer globalement via npm
npm install -g baipiao

# Verify
baipiao --version
```

## Trois modes d’usage

Choisissez le mode selon votre objectif :

| Mode | Entrée | Objectif |
|---|---|---|
| **Configuration structurée** | `search` / `info` / `setup` | Configurer des services connus (Groq, OpenRouter, Supabase) |
| **Catalogue gratuit complet** | `catalog candidates` | Rechercher dans `free-for-dev` par langue, catégorie et mot-clé |
| **Interface Agent** | `mcp` | Laisser Cursor / Claude Code / Codex appeler service, prompt, Vault, env et tests |

La plupart des projets démarrent par la configuration structurée, utilisent `catalog` quand ils ont besoin de plus d’options, puis ajoutent MCP quand l’Agent doit suivre l’état du projet en continu.

## Cinq étapes vers le premier service

Exemple avec **Groq** (API LLM gratuite).

### Étape 1 : Initialiser un projet

```bash
baipiao init --name my-ai-tool
```

Cette commande crée `.baipiao/` avec `project.json`, `services.json`, `.env.local` et `.env.example`.

### Étape 2 : Rechercher et inspecter

```bash
# Rechercher des services LLM gratuits
baipiao search llm

# Inspecter Groq — clés d’env, limites gratuites, notes de risques
baipiao info groq
```

Exemple de sortie `search` :

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

### Étape 3 : Générer un prompt de configuration pour l’Agent

```bash
baipiao prompt groq --copy
```

`--copy` puts the prompt on your clipboard. The prompt includes:
- The target page URL (e.g. `https://console.groq.com/keys`)
- Step-by-step instructions (create an API key, naming conventions)
- **Safety boundaries** (no Billing clicks, no password entry, no CAPTCHA bypass)
- Expected output format (`GROQ_API_KEY=...`)

Paste the prompt to your Agent (Cursor / Claude Code / Codex). The Agent handles the browser work and returns the result.

### Étape 4 : Analyser et enregistrer la sortie

```bash
baipiao setup groq
```

Paste the Agent's output:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

`setup` automatically: parses `KEY=VALUE` → validates format → stores in Vault → writes `.env.local` → runs connection test → updates service state.

### Étape 5 : Vérifier

```bash
# Check overall project status
baipiao status

# Test Groq connectivity
baipiao test groq

# List all Vault keys (no plaintext shown)
baipiao vault list
```

## Complete command reference

### Initialisation du projet

- `baipiao init [--name <name>]` — Génère le squelette du projet `.baipiao`

### Recherche de services

- `baipiao search <query>` — Cherche des services gratuits par mot-clé ou catégorie (`llm`, `database`, `storage`)
- `baipiao info <service>` — Affiche les métadonnées, champs env, limites gratuites et risques

### Catalogue gratuit complet

- `baipiao catalog candidates` — List the full `free-for-dev` candidate catalog
- `baipiao catalog candidates --query openrouter` — Search candidates by user input
- `baipiao catalog candidates --category llm` — Filter by normalized category
- `baipiao catalog candidates --locale zh-CN` — Return candidate fields in a requested locale
- `baipiao catalog categories` — Show candidate category counts
- `baipiao catalog translation-batch --locale ja` — Export entries for translation
- `baipiao catalog localize --locale ja --input translations.ja.json` — Import offline translations

### Génération de prompt

- `baipiao prompt <service> [--copy]` — Génère un prompt de configuration sécurisé pour l’Agent

### Configuration

- `baipiao setup <service>` — Lance le flux complet de configuration en mode interactif
- `baipiao output <service>` — Importe une configuration depuis une sortie externe

### Vault

- `baipiao vault` — Vault overview
- `baipiao vault list` — Show all key statuses (no plaintext)
- `baipiao vault set <KEY>` — Manually store a single key
- `baipiao vault import` — Bulk import `KEY=VALUE`
- `baipiao vault copy <KEY>` — Copy key to clipboard
- `baipiao vault remove <KEY>` — Delete a key
- `baipiao vault health` — Health check for all stored keys

### Env management

- `baipiao env generate` — Write `.env.local` from Vault
- `baipiao env generate --example` — Write `.env.example` (key names only)

### Test et état

- `baipiao test [service]` — Teste la connectivité d’un service (OpenAI-compatible / HTTP / Supabase / S3)
- `baipiao status` — Résumé de l’état global du projet

### Stack recommendations

- `baipiao stack recommend <type>` — Recommande une stack gratuite selon le type de projet
  - `type` : `ai_saas` / `rag` / `blog` / `agent_tool` / `mobile_app` / `custom`
- `baipiao setup-stack <type>` — Génère en lot les prompts de setup pour tous les services recommandés

### MCP integration

- `baipiao mcp` — Démarre le serveur MCP stdio
- `baipiao mcp install <cursor|claude|codex>` — Installe la configuration client MCP

## Niveaux de capacité des services

Chaque service `baipiao` possède des tags de capacité :

| Tag | Meaning |
|---|---|
| `prompt` | Peut générer un prompt de configuration Agent |
| `config` | Clés env structurées : peut valider et persister |
| `test` | Peut tester automatiquement la connectivité |

Tous les services supportent au minimum `prompt`. Ceux avec configuration structurée supportent aussi `config` et `test`.

## Stacks recommandées par type de projet

Issues de la commande `baipiao stack recommend` :

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

## Security model

`baipiao` est conçu selon le principe « jamais de fuite de secrets » :

- **Vault** stocke les clés secrètes dans le coffre système (Keychain macOS / Windows Credential Manager / Linux Secret Service)
- Tous les logs et états sont **automatiquement masqués** — aucune valeur en clair dans le terminal
- MCP **n’expose pas** d’endpoints dangereux : `vault_reveal`, `get_secret_value`, etc.
- Chaque prompt généré inclut des **règles de sécurité obligatoires** : pas de clic sur facture/upgrade, pas de contournement CAPTCHA, pas de stockage de mot de passe
- `.env.example` ne contient que les noms de clés, jamais les valeurs

## Vue d’ensemble de l’architecture

```text
packages/
  cli/           — Point d’entrée du CLI
  core/          — Logique partagée : registre, moteur de prompts, parseur, Vault, env, tests
  mcp-server/    — Serveur MCP exposant les outils en allowlist

registry/
  catalog/       — Catalogue des services et données de catégories
  configs/       — Configurations YAML structurées par service

templates/
  prompts/       — Templates de prompts (structurés / génériques)
```

## Étapes suivantes

- Référence complète des commandes CLI → [docs CLI](/docs/fr/cli)
- Contrats des outils MCP et limites de sécurité → [docs MCP](/docs/fr/mcp)
