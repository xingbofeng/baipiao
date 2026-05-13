---
translationStatus: translated
---
# CLI

`baipiao` est l’interface CLI. Chaque commande peut être exécutée seule ou chaînée dans un flux de configuration complet.

## Démarrage rapide

Installez et configurez votre premier service :

```bash
# Install the CLI
npm install -g baipiao

# Initialize the current project
baipiao init --name my-ai-tool

# Search free LLM services
baipiao search llm

# Generate a setup prompt and capture Agent output
baipiao setup groq

# Generate .env.local from Vault
baipiao env generate

# Test Groq connectivity
baipiao test groq
```

Recherchez dans le catalogue gratuit complet :

```bash
# Search the full candidate catalog by keyword
baipiao catalog candidates --query openrouter

# Filter by normalized category
baipiao catalog candidates --category llm

# Return candidate fields in a requested locale
baipiao catalog candidates --locale zh-CN
```

## init

```text
baipiao init [--name <name>]
```

Initialise le contexte du projet. Crée la structure du répertoire `.baipiao/`.

| Argument | Type | Description |
| --- | --- | --- |
| `--name` | `<string>` | Nom du projet, également utilisé comme slug. Utilise le nom du répertoire courant si omis |

**Sortie**

```text
✓ Initialized baipiao in /home/user/my-ai-tool
  Created .baipiao/project.json
  Created .baipiao/services.json
  Created .env.local
  Created .env.example
```

Si le projet est déjà initialisé :

```text
⚠ Project already initialized at /home/user/my-ai-tool
```

**Exemples**

```bash
baipiao init
baipiao init --name my-ai-tool
```

## search

```text
baipiao search <query>
```

Recherche dans le catalogue complet `free-for-dev` par mot-clé ou catégorie, avec recherche floue et mots-clés multilingues.

| Argument | Type | Description |
| --- | --- | --- |
| `<query>` | `string` | Mot-clé de recherche. Accepte catégories, noms de service, orthographe approximative et requêtes multilingues |

**Sortie**

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

Tags de capacité :

| Balise | Signification |
| --- | --- |
| `prompt` | Peut générer un prompt de configuration pour Agent |
| `config` | Clés d’environnement structurées — validation et persistance possibles |
| `test` | Peut tester automatiquement la connectivité |

**Exemples**

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

Recherche complète du catalogue `free-for-dev` et workflow de localisation hors ligne. `candidates` renvoie le catalogue normalisé complet avec filtrage par mot-clé/catégorie ; `categories` renvoie le nombre par catégorie ; `translation-batch` exporte les champs à traduire ; `localize` réécrit les traductions dans `enrichment.localization`.

Langues prises en charge :

| Langue | Signification |
| --- | --- |
| `en` | Source anglaise |
| `zh-CN` | Chinois simplifié |
| `ja` | Japonais |
| `ko` | Coréen |
| `fr` | Français |
| `es` | Espagnol |

**Exemples**

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

Afficher les métadonnées d’un service : liens, variables d’environnement, détails du niveau gratuit et notes de risque.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Identifiant de service ou slug (par ex. `groq`, `openrouter`, `supabase`) |

**Sortie**

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
  • Les limites de débit s’appliquent par modèle
  • Vérifiez la disponibilité actuelle du niveau gratuit avant usage en production
```

**Exemples**

```bash
baipiao info groq
baipiao info supabase
```

## prompt

```text
baipiao prompt <service> [--copy]
```

Génère un prompt de configuration sécurisé pour un Agent. Les services structurés (avec configuration YAML) produisent des prompts précis ; les services non structurés reçoivent un modèle générique.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Identifiant de service ou slug |
| `--copy` | `boolean` | Copie le prompt généré dans le presse-papiers système |

**Sortie** (service structuré — exemple Groq)

```text
Vous êtes mon assistant de configuration dans le navigateur.

Objectif :
Aidez-moi à configurer les ressources gratuites de Groq et à créer la
clé API requise.

Page d’entrée :
https://console.groq.com/keys

Étapes :
1. If not logged in, pause and ask me to complete login, CAPTCHA,
   email verification, or 2FA.
2. Create a new API key.
3. Use the name baipiao-${project_slug}.
4. Copy the generated API key.

Règles de sécurité :
• Do not ask for or store my web login password.
• Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
• Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
• Do not enable any paid feature.

Une fois terminé, renvoyez uniquement :
GROQ_API_KEY=...
```

**Exemples**

```bash
baipiao prompt groq
baipiao prompt groq --copy
baipiao prompt huggingface # résout le candidat gratuit huggingface.co
```

## setup

```text
baipiao setup <service>
```

Flux interactif de configuration complet : génération du prompt → attente de la sortie Agent → parsing → validation → persistance → écriture env → test.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Identifiant de service ou slug |

**Flux interactif**

```text
$ baipiao setup groq

→ Generating setup prompt for Groq...
✓ Prompt copié dans le presse-papiers

Paste the Agent's output below (end with an empty line):
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

✓ Parsed 1 entry
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
→ Running connection test...
✓ Connection test passed (latency: 234ms)

Statut : testé
```

**Machine d’états**

```text
not_started → prompt_generated → agent_output_received
  → configured_unverified → configured → tested
```

**Exemples**

```bash
baipiao setup groq
baipiao setup supabase
```

## output

```text
baipiao output <service> [--input <text>]
```

Même point d’entrée que `setup`, pour importer la sortie d’un Agent depuis des sources externes.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Identifiant de service ou slug |
| `--input` | `<string>` | Fournit directement le texte KEY=VALUE en évitant le collage interactif |

**Formats d’entrée pris en charge**

- Format env : `KEY=VALUE`
- Bloc de code délimité :
  ````text
  ```env
  GROQ_API_KEY=gsk_xxx
  ```
  ````
- Format avec deux-points : `API Key: abc`, `Endpoint: https://example.com`

**Exemples**

```bash
baipiao output groq
baipiao output groq --input "GROQ_API_KEY=gsk_xxx"
```

## env generate

```text
baipiao env generate [--example] [--include-unverified]
```

Lit la configuration stockée dans le Vault et écrit les fichiers de variables d’environnement.

| Argument | Type | Description |
| --- | --- | --- |
| `--example` | `boolean` | Écrit `.env.example` (uniquement les noms de clés, sans valeur) |
| `--include-unverified` | `boolean` | Inclut les configurations non vérifiées avec avertissements de risque |

**Sortie**

```text
$ baipiao env generate
✓ .env.local written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

$ baipiao env generate --example
✓ .env.example written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
```

**Exemples**

```bash
baipiao env generate
baipiao env generate --example
baipiao env generate --include-unverified
```

## test

```text
baipiao test [<service>]
```

Teste la connectivité des services. Sans service spécifié, teste tous les services suivis du projet courant.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Optionnel. Identifiant de service ou slug |

**Sortie**

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

**Types de test pris en charge**

| Type | Description |
| --- | --- |
| `openai_compatible_chat` | Envoie une requête de chat completion pour valider la clé API (Groq, OpenRouter) |
| `http` | Validation HTTP GET/POST (Gemini) |
| `supabase` | Valide l’URL Supabase + Anon Key |
| `s3_compatible` | Valide la connectivité d’un stockage compatible S3 (Cloudflare R2) |

**Exemples**

```bash
baipiao test
baipiao test groq
baipiao test supabase
```

## status

```text
baipiao status
```

Affiche un récapitulatif de l’état global du projet courant.

**Sortie**

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

**Exemples**

```bash
baipiao status
```

## stack recommend

```text
baipiao stack recommend <type>
```

Recommande une stack technologique gratuite selon le type de projet.

| Argument | Type | Description |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | Type de projet |

**Sortie**

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

**Exemples**

```bash
baipiao stack recommend ai_saas
baipiao stack recommend rag
baipiao stack recommend blog
```

## setup-stack

```text
baipiao setup-stack <type>
```

Émet des sections de prompts de configuration pour chaque service de la stack recommandée.

| Argument | Type | Description |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | Type de projet |

**Exemples**

```bash
baipiao setup-stack ai_saas
```

## vault

```text
baipiao vault [<subcommand>]
```

Centre unifié de gestion des secrets. Sans sous-commande, affiche l’aperçu du Vault.

## Sous-commandes

### vault list

```text
baipiao vault list [--service <service>]
```

Liste l’état de toutes les clés. Aucune valeur en clair n’est affichée.

| Argument | Type | Description |
| --- | --- | --- |
| `--service` | `<string>` | Optionnel. Filtre par service |

```text
KEY                           STATUS     SCOPE    SERVICE
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

Stocke manuellement une seule clé. L’entrée est masquée (pas d’affichage).

| Argument | Type | Description |
| --- | --- | --- |
| `<KEY>` | `string` | Nom de la variable d’environnement |
| `--service` | `<string>` | Optionnel. Identifiant de service associé |

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

Importe en masse du texte KEY=VALUE. Parse, valide et persiste automatiquement.

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

Copie la valeur de la clé spécifiée dans le presse-papiers. Ne l’affiche jamais dans le terminal.

```text
$ baipiao vault copy GROQ_API_KEY
✓ GROQ_API_KEY copied to clipboard
✓ Clipboard will be cleared in 30 seconds
```

### vault reveal

```text
baipiao vault reveal <KEY>
```

Affiche la valeur en clair dans le terminal. **Nécessite une confirmation explicite.** Non exposé via MCP.

```text
$ baipiao vault reveal GROQ_API_KEY
This will print the secret value in your terminal. Continue? y/N
```

### vault remove

```text
baipiao vault remove <KEY>
```

Supprime la clé indiquée du magasin d’identifiants système.

```text
$ baipiao vault remove GROQ_API_KEY
✓ GROQ_API_KEY removed from Vault
⚠ This key still appears in .env.local. Remove it? y/N
```

### vault health

```text
baipiao vault health
```

Vérifie l’état et la validité de format de toutes les clés stockées.

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

Démarre le serveur MCP en mode stdio pour les outils de codage IA.

| Argument | Type | Description |
| --- | --- | --- |
| `--dry-run` | `boolean` | Vérifie la préparation sans démarrer le serveur réel |

**Exemples**

```bash
baipiao mcp
baipiao mcp --dry-run
```

## mcp install

```text
baipiao mcp install <client> [--port <port>]
```

Installe baipiao dans le client MCP ciblé. La commande met à jour la configuration du client directement.

| Argument | Type | Description |
| --- | --- | --- |
| `<client>` | `cursor \| claude \| codex` | Outil de codage IA ciblé |
| `--port` | `<number>` | Installe une configuration HTTP pointant vers `http://127.0.0.1:<port>/mcp` |

**Configuration map manuelle** (mode stdio)

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

**Configuration map manuelle** (mode HTTP)

```json
{
  "mcpServers": {
    "baipiao": {
      "url": "http://127.0.0.1:7331/mcp"
    }
  }
}
```

> Utilisez `baipiao mcp --port 7331` pour démarrer le serveur HTTP, puis `baipiao mcp install <client> --port 7331` pour installer la configuration cliente correspondante.

**Exemples**

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex --port 7331
```

## Attentes de sécurité

- N’automatise jamais la facturation, la mise à niveau ou les clics d’abonnement
- Ne stocke jamais ni ne demande les mots de passe de connexion web
- Ne contourne jamais CAPTCHA, 2FA, vérification par téléphone ou contrôles de risque de la plateforme
- `vault list` n’affiche jamais de valeur en clair ; `vault copy` passe par le presse-papiers
- MCP n’expose pas `vault_reveal`, `get_secret_value`, `shell_exec`, `browser_click`, ni d’autres endpoints dangereux similaires
- Les logs et sorties d’état sont rognés par défaut
