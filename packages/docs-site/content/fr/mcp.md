---
translationStatus: translated
---
# MCP

MCP est la couche protocolaire qui expose les capacités principales de `baipiao` aux outils de codage IA externes (Claude Code, Cursor, Codex). Tous les outils reposent sur une liste blanche — les opérations dangereuses sont explicitement bloquées.

## Démarrage

Installez le CLI et enregistrez baipiao dans votre client MCP :

```bash
# Install the CLI
npm install -g baipiao

# Installer la configuration MCP pour Cursor
baipiao mcp install cursor

# Installer la configuration MCP pour Claude Code
baipiao mcp install claude

# Installer la configuration MCP pour Codex
baipiao mcp install codex
```

Configuration map manuelle copiable :

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

Appels MCP courants :

```text
# La recherche par défaut utilise le catalogue free-for-dev complet et accepte la recherche floue
mcp: list_services { "query": "openruter", "limit": 20 }

# À utiliser pour locale, pagination ou sourceCategory
mcp: list_free_catalog_candidates { "query": "openrouter", "locale": "zh-CN", "limit": 20 }

# Generate an Agent setup prompt for a service
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

# Read current project status
mcp: get_status {}
```

## Démarrage du serveur

```bash
baipiao mcp                # stdio mode (default)
baipiao mcp --dry-run      # readiness check only
baipiao mcp --port 7331    # serveur MCP HTTP local
baipiao mcp install cursor # installe la configuration client
```

## Compatibilité protocolaire

Le serveur MCP gère le cycle de vie JSON-RPC standard utilisé par les clients actuels :

- `initialize` renvoie la protocol version négociée, la tools capability et les informations serveur `baipiao-mcp`.
- `notifications/initialized` et les autres notifications sont acceptées sans réponse d’erreur JSON-RPC.
- `ping` renvoie un résultat de succès vide.
- En mode HTTP, les requêtes contenant uniquement une notification renvoient `202` avec un body vide, au lieu d’un payload d’erreur JSON-RPC.

## Déclaration de sécurité

**MCP n’expose PAS :**

`vault_reveal`, `get_secret_value`, `browser_click`, `browser_type`, `shell_exec`, `read_any_file`, `write_any_file`, `delete_file`, `upload_secret`

Concrètement :
- Les valeurs en clair du Vault ne sont jamais renvoyées aux modèles externes
- Les lectures/écritures arbitraires de fichiers ne sont pas autorisées
- Les exécutions shell ou navigateur arbitraires ne sont pas autorisées

**Légende des annotations d’outil :**

| Annotation | Signification |
| --- | --- |
| 🔒 `readOnly` | Lecture seule, ne modifie pas l’état |
| ⚡ `idempotent` | Peut être répétée sans effet secondaire |
| ⚠️ `destructive` | Modifie ou supprime des données |

---

## list_services

Recherche dans le catalogue complet `free-for-dev` avec filtrage optionnel par mot-clé, catégorie et capacité. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `query` | `string` | Non | Mot-clé de recherche ou nom de catégorie |
| `category` | `string` | Non | Filtre par catégorie |
| `capability` | `"prompt" \| "config" \| "test"` | Non | Filtre par étiquette de capacité |
| `limit` | `number` | Non | Nombre maximum de résultats |

**Sortie**

```json
{
  "services": [
    {
      "id": "groq",
      "name": "Groq",
      "category": "llm",
      "capability": ["prompt", "config", "test"],
      "freeTier": "Niveau gratuit avec limites de débit pour les modèles pris en charge."
    },
    {
      "id": "huggingface",
      "name": "Hugging Face",
      "category": "llm",
      "capability": ["prompt"],
      "freeTier": "API d’inférence gratuite avec limites de débit."
    }
  ]
}
```

## list_free_catalog_candidates

Liste le catalogue complet `free-for-dev` avec filtres sur mot-clé, catégorie, catégorie source, locale, limit et offset. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `query` | `string` | Non | Mot-clé de recherche |
| `category` | `string` | Non | Filtre par catégorie normalisée |
| `sourceCategory` | `string` | Non | Filtre par section du Markdown source |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Non | Locale demandée pour la sortie |
| `systemLocale` | `string` | Non | Indice de locale fourni par l’environnement hôte |
| `limit` | `number` | Non | Nombre maximum de résultats |
| `offset` | `number` | Non | Décalage de pagination |

**Sortie**

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

Retourne le nombre de services par catégorie et source-category pour le catalogue complet. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Non | Indice de locale pour les libellés |

## get_free_catalog_translation_batch

Retourne le texte source pour les candidats non traduits d’une locale. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Oui | Locale cible |
| `query` | `string` | Non | Mot-clé de recherche |
| `category` | `string` | Non | Filtre par catégorie |
| `sourceCategory` | `string` | Non | Filtre par section source |
| `limit` | `number` | Non | Nombre maximum de résultats |
| `offset` | `number` | Non | Décalage de pagination |
| `untranslatedOnly` | `boolean` | Non | Ne renvoie que les entrées non totalement localisées |

## apply_free_catalog_translations

Écrit les traductions hors ligne dans `enrichment.localization`. ⚡ `idempotent`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Oui | Locale cible |
| `translations` | `array` | Oui | Entrées de traduction avec `id`, `name?`, `description?`, `freeTierText?` |

**Sortie**

```json
{
  "updated": 12,
  "missing": ["free-for-dev:generative-ai:missing-item"]
}
```

## get_service_info

Récupère les métadonnées complètes d’un service. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Oui | Identifiant de service ou slug |

**Sortie**

```json
{
  "service": {
    "id": "groq",
    "name": "Groq",
    "slug": "groq",
    "category": "llm",
    "description": "API d’inférence LLM rapide avec niveau gratuit.",
    "urls": {
      "homepage": "https://groq.com",
      "console": "https://console.groq.com",
      "apiKeys": "https://console.groq.com/keys",
      "docs": "https://console.groq.com/docs"
    },
    "freeTier": {
      "summary": "Niveau gratuit avec limites de débit pour les modèles pris en charge.",
      "requiresCreditCard": false,
      "resetCycle": "daily"
    },
    "env": [
      {
        "key": "GROQ_API_KEY",
        "secret": true,
        "required": true,
        "pattern": "^gsk_[A-Za-z0-9]+$",
        "description": "Clé API Groq"
      }
    ],
    "capability": ["prompt", "config", "test"],
    "risks": [
      "Les limites de débit s’appliquent par modèle",
      "Vérifiez la disponibilité actuelle du niveau gratuit avant usage en production"
    ]
  }
}
```

## generate_setup_prompt

Génère un prompt de configuration Agent pour un service. Les services structurés obtiennent des prompts précis ; les services non structurés obtiennent un modèle générique. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Oui | Identifiant de service ou slug |
| `projectSlug` | `string` | Non | Identifiant de projet pour le nommage du prompt |

**Sortie**

```json
{
  "serviceId": "groq",
  "serviceName": "Groq",
  "prompt": "Vous êtes mon assistant de configuration dans le navigateur.\n\nObjectif :\nAidez-moi à configurer les ressources gratuites de Groq...\n\nUne fois terminé, renvoyez uniquement :\nGROQ_API_KEY=...",
  "outputFormat": "GROQ_API_KEY=...",
  "requiredEnvKeys": ["GROQ_API_KEY"],
  "capability": ["prompt", "config", "test"]
}
```

## parse_agent_output

Analyse un texte renvoyé par Agent et extrait les entrées KEY=VALUE. Ne persiste pas les données. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `text` | `string` | Oui | Texte brut renvoyé par l’Agent |
| `serviceId` | `string` | Non | Service associé, pour la validation de format et le mapping de champs |

**Sortie**

```json
{
  "entries": [
    { "key": "GROQ_API_KEY", "value": "gsk_xxx", "secret": true }
  ],
  "notes": ["1 entrée analysée depuis le format KEY=VALUE"],
  "warnings": []
}
```

Échec d’analyse :

```json
{
  "entries": [],
  "notes": [],
  "warnings": [
    "La ligne 3 n’a pas pu être analysée : 'some invalid text'"
  ]
}
```

**Formats d’entrée pris en charge**

- Format env : `KEY=VALUE`
- Bloc de code markdown fenced
- Format avec deux-points : `API Key: abc`, `Endpoint: https://example.com`

## save_agent_output

Analyse la sortie Agent et la persiste dans le Vault. ⚡ `idempotent`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Oui | Identifiant de service ou slug |
| `text` | `string` | Oui | Texte brut renvoyé par l’Agent |

**Sortie**

```json
{
  "saved": [
    { "key": "GROQ_API_KEY", "serviceId": "groq", "scope": "server" }
  ],
  "failed": [],
  "state": "configured"
}
```

Échec partiel :

```json
{
  "saved": [
    { "key": "SUPABASE_URL", "serviceId": "supabase", "scope": "public" }
  ],
  "failed": [
    {
      "key": "SUPABASE_ANON_KEY",
      "reason": "Correspondance de motif incorrecte : attendu ^eyJ..."
    }
  ],
  "state": "configured_unverified"
}
```

## validate_secret

Valide le format d’une valeur de clé et renvoie les services correspondants. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `key` | `string` | Oui | Nom de variable d’environnement |
| `value` | `string` | Oui | Valeur à valider |

**Sortie**

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

Liste les métadonnées de toutes les clés dans le Vault. **Ne renvoie jamais les valeurs en clair.** 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Non | Filtre par service |

**Sortie**

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

Stocke une seule clé secrète. La valeur n’est pas renvoyée. ⚡ `idempotent`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `key` | `string` | Oui | Nom de variable d’environnement |
| `value` | `string` | Oui | Valeur à stocker (non renvoyée) |
| `serviceId` | `string` | Non | Identifiant de service associé |

**Sortie**

```json
{
  "saved": true,
  "key": "GROQ_API_KEY",
  "serviceId": "groq",
  "scope": "server"
}
```

## vault_import

Importe en lot des paires KEY=VALUE, avec parsing, validation et persistance automatiques. ⚡ `idempotent`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `text` | `string` | Oui | Texte multi-lignes KEY=VALUE |
| `serviceId` | `string` | Non | Identifiant de service associé |

**Sortie**

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

Copie la valeur d’une clé dans le presse-papiers. **La valeur n’est jamais renvoyée via MCP.** ⚡ `idempotent`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `key` | `string` | Oui | Nom de la clé à copier |

**Sortie**

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

Supprime une clé du magasin d’informations système. ⚠️ `destructive`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `key` | `string` | Oui | Nom de clé à supprimer |

**Sortie**

```json
{
  "removed": true,
  "key": "GROQ_API_KEY"
}
```

## vault_health

Vérifie l’état de santé de toutes les clés stockées. 🔒 `readOnly`

**Entrée**

`None`

**Sortie**

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
    "warnings": ["clé réservée au serveur : ne pas exposer au frontend"]
    },
    {
      "key": "OPENROUTER_API_KEY",
      "status": "missing",
      "formatValid": null,
      "connection": null,
    "warnings": ["Clé introuvable dans le Vault"]
    }
  ]
}
```

## generate_env

Génère les fichiers de variables d’environnement depuis le Vault. ⚠️ `destructive` (écrit dans le système de fichiers)

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `path` | `string` | Non | Chemin cible, par défaut `.env.local` |
| `example` | `boolean` | Non | Génère `.env.example` (noms de clés uniquement) |
| `includeUnverified` | `boolean` | Non | Inclut les configurations non vérifiées |

**Sortie**

```json
{
  "path": ".env.local",
  "writtenKeys": ["GROQ_API_KEY", "GEMINI_API_KEY", "SUPABASE_URL"],
  "missingKeys": ["OPENROUTER_API_KEY"]
}
```

## test_connection

Exécute un test de connectivité pour le service spécifié. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Oui | Identifiant de service ou slug |

**Sortie**

```json
{
  "serviceId": "groq",
  "ok": true,
  "status": "passed",
  "message": "Connexion réussie",
  "latencyMs": 234
}
```

```json
{
  "serviceId": "huggingface",
  "ok": false,
  "status": "skipped",
  "message": "Le service ne prend pas en charge les tests automatisés",
  "latencyMs": null
}
```

## get_status

Récupère le résumé global de l’état du projet courant. 🔒 `readOnly`

**Entrée**

`None`

**Sortie**

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

Recommande une stack technologique gratuite selon le type de projet. 🔒 `readOnly`

**Entrée**

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `useCase` | `"ai_saas" \| "rag" \| "blog" \| "agent_tool" \| "mobile_app" \| "custom"` | Oui | Type de projet |

**Sortie**

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
      "Tous les services prennent en charge un niveau gratuit",
      "Configurez Groq en premier - les autres services peuvent dépendre du flux d’authentification"
    ]
  }
}
```

## Vue d’ensemble des outils

| Outil | Type | Description |
| --- | --- | --- |
| `list_services` | 🔒 readOnly | Rechercher dans le catalogue |
| `get_service_info` | 🔒 readOnly | Obtenir les détails du service |
| `generate_setup_prompt` | 🔒 readOnly | Générer un prompt de configuration Agent |
| `parse_agent_output` | 🔒 readOnly | Analyser la sortie Agent |
| `save_agent_output` | ⚡ idempotent | Sauvegarder la sortie Agent dans Vault |
| `validate_secret` | 🔒 readOnly | Valider le format d’une clé |
| `vault_list` | 🔒 readOnly | Lister les métadonnées de Vault |
| `vault_set` | ⚡ idempotent | Stocker une seule clé |
| `vault_import` | ⚡ idempotent | Importer des clés en lot |
| `vault_copy` | ⚡ idempotent | Copier une clé vers le presse-papiers |
| `vault_remove` | ⚠️ destructive | Supprimer une clé |
| `vault_health` | 🔒 readOnly | Vérifier la santé des clés |
| `generate_env` | ⚠️ destructive | Écrire un fichier env |
| `test_connection` | 🔒 readOnly | Tester la connectivité d’un service |
| `get_status` | 🔒 readOnly | Résumé de l’état du projet |
| `recommend_stack` | 🔒 readOnly | Recommander une stack |

## Options d’installation

### Cursor

```bash
baipiao mcp install cursor
```

Sortie :

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

Sortie :

```json
{
  "client": "claude",
  "transport": "http",
  "url": "http://127.0.0.1:7331/mcp",
  "localOnly": true
}
```

> Utilisez `baipiao mcp --port 7331` pour démarrer le serveur HTTP, puis `baipiao mcp install <client> --port 7331` pour installer la configuration cliente correspondante.

## Exemple d’utilisation des outils

```text
1) Rechercher des services LLM
mcp: list_services { "query": "llm", "capability": "config", "limit": 10 }

2) Récupérer les détails Groq
mcp: get_service_info { "serviceId": "groq" }

3) Générer un prompt de configuration
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

4) Enregistrer la sortie Agent
mcp: save_agent_output {
  "serviceId": "groq",
  "text": "GROQ_API_KEY=gsk_xxx"
}

5) Vérifier l’état
mcp: get_status {}

6) Générer env
mcp: generate_env { "example": false }
```
