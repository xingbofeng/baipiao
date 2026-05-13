---
translationStatus: translated
---
# Inicio rápido

`baipiao` es un CLI **Prompt-first / MCP-first** para configurar servicios gratuitos para desarrolladores.  
Te permite descubrir servicios con capa gratuita, generar prompts de configuración seguros para tu agente de IA, recopilar la salida del agente, guardar claves en un Vault local, generar archivos `.env`, probar conectividad y exponer todo a herramientas de IA mediante MCP.

## Empieza aquí

```bash
npm install -g baipiao
baipiao init --name my-ai-tool
baipiao search llm
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
```

Usa esto para el catálogo gratuito completo:

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog candidates --locale zh-CN
```

Usa estas para configurar MCP:

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

## Entiéndelo en 30 segundos

`baipiao` no es solo un script de almacenamiento de claves. Divide « encontrar un servicio gratuito, pedir a un agente que lo configure y traer de forma segura el resultado » en unos pocos flujos estables:

| Necesidad | Punto de entrada | Resultado |
|---|---|---|
| Encontrar servicios gratis curados | `baipiao search llm` | Servicios revisados con capacidades de configuración y prueba |
| Buscar en el catálogo completo | `baipiao catalog candidates --query openrouter` | Búsqueda completa en `free-for-dev` |
| Leer candidatos por idioma | `baipiao catalog candidates --locale zh-CN` | Campos localizados con respaldo en inglés |
| Pedir configuración a un agente | `baipiao setup groq` | Prompt seguro + captura de salida del agente |
| Gestionar claves y archivos env | `baipiao vault list` / `baipiao env generate` | Guardado en Vault y generación de `.env.local` |
| Exponer herramientas al agente | `baipiao mcp` | Herramientas MCP con las mismas capacidades |

El flujo principal es:

```text
Descubrimiento de servicios → Generación de prompts → Ejecución del agente → Análisis de salida → Almacenamiento en Vault → Generación de env → Prueba de conexión → Exposición MCP
```

No automatiza el registro de cuentas, no controla navegadores y nunca guarda tu contraseña de inicio de sesión web.  
El inicio de sesión, CAPTCHA, 2FA y acciones sensibles de facturación quedan para intervención humana.

## Requisitos previos

- **Node.js >= 20**
- **pnpm** (package manager)
- A terminal (macOS Terminal / iTerm2 / Windows Terminal / Linux shell)
- Una herramienta de IA compatible con MCP (opcional): Cursor / Claude Code / Codex

## Instalación

```bash
# Instalar globalmente con npm
npm install -g baipiao

# Verificar
baipiao --version
```

## Tres rutas de uso

Elige la ruta según lo que quieras hacer:

| Ruta | Entrada | Objetivo |
|---|---|---|
| **Configuración estructurada** | `search` / `info` / `setup` | Configurar servicios conocidos como Groq, OpenRouter, Supabase |
| **Catálogo completo** | `catalog candidates` | Buscar candidatos de `free-for-dev` por idioma, categoría y palabra clave |
| **Interfaz de agente** | `mcp` | Permitir que Cursor / Claude Code / Codex llamen a herramientas de servicio, prompt, Vault, env y pruebas |

La mayoría de los proyectos comienza con configuración estructurada, usa `catalog` cuando necesita más candidatos gratuitos y añade MCP cuando el agente debe seguir leyendo el estado del proyecto/servicio.

## Cinco pasos para tu primer servicio

Ejemplo con **Groq** (API LLM gratuita).

### Paso 1: Inicializar un proyecto

```bash
baipiao init --name my-ai-tool
```

Esto crea `.baipiao/` con `project.json`, `services.json`, `.env.local` y `.env.example`.

### Paso 2: Buscar e inspeccionar

```bash
# Buscar servicios LLM gratuitos
baipiao search llm

# Inspeccionar Groq: claves env necesarias, límites gratuitos y notas de riesgo
baipiao info groq
```

Ejemplo de salida de `search`:

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

### Paso 3: Generar un prompt de configuración para Agent

```bash
baipiao prompt groq --copy
```

`--copy` puts the prompt on your clipboard. The prompt includes:
- The target page URL (e.g. `https://console.groq.com/keys`)
- Step-by-step instructions (create an API key, naming conventions)
- **Safety boundaries** (no Billing clicks, no password entry, no CAPTCHA bypass)
- Expected output format (`GROQ_API_KEY=...`)

Paste the prompt to your Agent (Cursor / Claude Code / Codex). The Agent handles the browser work and returns the result.

### Paso 4: Analizar y guardar la salida

```bash
baipiao setup groq
```

Paste the Agent's output:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

`setup` automatically: parses `KEY=VALUE` → validates format → stores in Vault → writes `.env.local` → runs connection test → updates service state.

### Paso 5: Verificar

```bash
# Check overall project status
baipiao status

# Test Groq connectivity
baipiao test groq

# List all Vault keys (no plaintext shown)
baipiao vault list
```

## Complete command reference

### Inicialización del proyecto

- `baipiao init [--name <name>]` — Crea el esqueleto del proyecto `.baipiao`

### Descubrimiento de servicios

- `baipiao search <query>` — Search free services by keyword or category (`llm`, `database`, `storage`)
- `baipiao info <service>` — Ver metadatos del servicio, campos env, nivel gratuito y riesgos

### Catálogo gratuito completo

- `baipiao catalog candidates` — List the full `free-for-dev` candidate catalog
- `baipiao catalog candidates --query openrouter` — Search candidates by user input
- `baipiao catalog candidates --category llm` — Filter by normalized category
- `baipiao catalog candidates --locale zh-CN` — Return candidate fields in a requested locale
- `baipiao catalog categories` — Show candidate category counts
- `baipiao catalog translation-batch --locale ja` — Export entries for translation
- `baipiao catalog localize --locale ja --input translations.ja.json` — Import offline translations

### Generación de prompts

- `baipiao prompt <service> [--copy]` — Genera un prompt de configuración seguro para el agente

### Configuración

- `baipiao setup <service>` — Ejecuta el flujo completo de configuración interactiva
- `baipiao output <service>` — Importa configuración desde salida externa

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

### Prueba y estado

- `baipiao test [service]` — Prueba conectividad del servicio (compatible OpenAI / HTTP / Supabase / S3)
- `baipiao status` — Resumen del estado global del proyecto

### Stack recommendations

- `baipiao stack recommend <type>` — Recomienda una pila gratuita por tipo de proyecto
  - `type`: `ai_saas` / `rag` / `blog` / `agent_tool` / `mobile_app` / `custom`
- `baipiao setup-stack <type>` — Genera en lote prompts de configuración para toda la pila

### Integración MCP

- `baipiao mcp` — Inicia el servidor MCP stdio
- `baipiao mcp install <cursor|claude|codex>` — Genera configuración del cliente MCP

## Niveles de capacidad del servicio

Cada servicio de baipiao tiene etiquetas de capacidad:

| Tag | Significado |
|---|---|
| `prompt` | Puede generar un prompt de configuración para el agente |
| `config` | Claves env estructuradas: valida y persiste |
| `test` | Puede probar la conectividad automáticamente |

Todos los servicios soportan al menos `prompt`. Los servicios con configuración estructurada también soportan `config` y `test`.

## Pilas recomendadas por tipo de proyecto

Basado en la salida de `baipiao stack recommend`:

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

## Modelo de seguridad

`baipiao` se diseña bajo el principio de « los secretos no se filtran »:

- **Vault** guarda claves secretas en el gestor del sistema (macOS Keychain / Windows Credential Manager / Linux Secret Service)
- Todos los logs y estados se **enmascaran automáticamente** — no hay secretos en texto plano en la terminal
- MCP **no expone** endpoints peligrosos: `vault_reveal`, `get_secret_value`, etc.
- Cada prompt generado incluye **límites de seguridad obligatorios**: sin clic en facturación/upgrade, sin saltar CAPTCHA, sin guardar contraseñas
- `.env.example` solo contiene nombres de clave, nunca valores

## Resumen de arquitectura

```text
packages/
  cli/           — Punto de entrada del comando terminal
  core/          — Lógica compartida: registro, motor de prompts, parser, Vault, env, tester
  mcp-server/    — Servidor MCP con herramientas permitidas por allowlist

registry/
  catalog/       — Catálogo de servicios y datos de categorías
  configs/       — Configuración YAML estructurada por servicio

templates/
  prompts/       — Plantillas de prompts (estructurados / genéricos)
```

## Próximos pasos

- Referencia completa del CLI → [docs CLI](/docs/es/cli)
- Contratos de herramientas MCP y límites de seguridad → [docs MCP](/docs/es/mcp)
