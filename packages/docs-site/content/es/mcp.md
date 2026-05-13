---
translationStatus: translated
---
# MCP

MCP es la capa de protocolo que expone las capacidades principales de `baipiao` a herramientas externas de IA para programación (Claude Code, Cursor, Codex). Todos los endpoints están en una lista blanca: las operaciones peligrosas están bloqueadas explícitamente.

## Inicio

Instala la CLI y registra baipiao en tu cliente MCP:

```bash
# Instalar la CLI
npm install -g baipiao

# Instalar configuración MCP para Cursor
baipiao mcp install cursor

# Instalar configuración MCP para Claude Code
baipiao mcp install claude

# Instalar configuración MCP para Codex
baipiao mcp install codex
```

Mapa de configuración manual copiable:

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

Llamadas MCP típicas:

```text
# La búsqueda predeterminada usa todo el catálogo free-for-dev y admite fuzzy search
mcp: list_services { "query": "openruter", "limit": 20 }

# Úsalo cuando necesites locale, paginación o sourceCategory
mcp: list_free_catalog_candidates { "query": "openrouter", "locale": "zh-CN", "limit": 20 }

# Generar un prompt de setup de Agent para un servicio
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

# Leer estado actual del proyecto
mcp: get_status {}
```

## Iniciar MCP

```bash
baipiao mcp                # modo stdio (predeterminado)
baipiao mcp --dry-run      # solo comprobación de preparación
baipiao mcp --port 7331    # servidor MCP HTTP local
baipiao mcp install cursor # instalar configuración de cliente
```

## Compatibilidad de protocolo

El servidor MCP gestiona el ciclo de vida JSON-RPC estándar usado por los clientes actuales:

- `initialize` devuelve la protocol version negociada, la tools capability y la información del servidor `baipiao-mcp`.
- `notifications/initialized` y otras notifications se aceptan sin respuestas de error JSON-RPC.
- `ping` devuelve un resultado de éxito vacío.
- En modo HTTP, las solicitudes que solo contienen notification devuelven `202` con body vacío, en lugar de un payload de error JSON-RPC.

## Declaración de seguridad

**MCP NO expone:**

`vault_reveal`, `get_secret_value`, `browser_click`, `browser_type`, `shell_exec`, `read_any_file`, `write_any_file`, `delete_file`, `upload_secret`

Esto significa:
- Vault nunca devuelve secretos en texto plano a modelos externos
- No se permite lectura/escritura arbitraria de archivos
- No se permite ejecución arbitraria de shell o navegador

**Leyenda de anotaciones:**

| Anotación | Significado |
| --- | --- |
| 🔒 `readOnly` | Solo lectura, no modifica estado |
| ⚡ `idempotent` | Idempotente, se puede repetir |
| ⚠️ `destructive` | Modifica o elimina datos |

---

## list_services

Busca en el catálogo completo `free-for-dev` con filtrado opcional por palabra clave, categoría y capacidad. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `query` | `string` | No | Palabra clave de búsqueda o nombre de categoría |
| `category` | `string` | No | Filtro por categoría |
| `capability` | `"prompt" \| "config" \| "test"` | No | Filtro por etiqueta de capacidad |
| `limit` | `number` | No | Máximo número de resultados |

**Salida**

```json
{
  "services": [
    {
      "id": "groq",
      "name": "Groq",
      "category": "llm",
      "capability": ["prompt", "config", "test"],
      "freeTier": "Nivel gratuito con límites de tasa para los modelos compatibles."
    },
    {
      "id": "huggingface",
      "name": "Hugging Face",
      "category": "llm",
      "capability": ["prompt"],
      "freeTier": "API de inferencia gratuita con límites de tasa."
    }
  ]
}
```

## list_free_catalog_candidates

Lista el catálogo completo de `free-for-dev` con filtros por palabra clave, categoría, fuente, localización, límite y desplazamiento. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `query` | `string` | No | Palabra clave |
| `category` | `string` | No | Filtro por categoría normalizada |
| `sourceCategory` | `string` | No | Filtro por sección source del Markdown original |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | No | Localización solicitada |
| `systemLocale` | `string` | No | Indicio de localización del entorno |
| `limit` | `number` | No | Máximo resultados |
| `offset` | `number` | No | Desplazamiento de paginación |

**Salida**

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

Devuelve recuentos de categoría y source-category del catálogo completo. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | No | Localización para etiquetas |

## get_free_catalog_translation_batch

Devuelve texto original de candidatos no totalmente localizados para una localización objetivo. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Sí | Localización objetivo |
| `query` | `string` | No | Palabra clave |
| `category` | `string` | No | Filtro por categoría |
| `sourceCategory` | `string` | No | Filtro por sección source |
| `limit` | `number` | No | Máximo resultados |
| `offset` | `number` | No | Desplazamiento |
| `untranslatedOnly` | `boolean` | No | Solo entradas sin traducir completamente |

## apply_free_catalog_translations

Escribe traducciones offline en `enrichment.localization`. ⚡ `idempotent`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Sí | Localización objetivo |
| `translations` | `array` | Sí | Entradas `id`, `name?`, `description?`, `freeTierText?` |

**Salida**

```json
{
  "updated": 12,
  "missing": ["free-for-dev:generative-ai:missing-item"]
}
```

## get_service_info

Obtiene metadatos completos de un servicio. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `serviceId` | `string` | Sí | ID del servicio o slug |

**Salida**

```json
{
  "service": {
    "id": "groq",
    "name": "Groq",
    "slug": "groq",
    "category": "llm",
    "description": "API rápida de inferencia LLM con nivel gratuito.",
    "urls": {
      "homepage": "https://console.groq.com",
      "console": "https://console.groq.com",
      "apiKeys": "https://console.groq.com/keys",
      "docs": "https://console.groq.com/docs"
    },
    "freeTier": {
      "summary": "Nivel gratuito con límites de tasa para los modelos compatibles.",
      "requiresCreditCard": false,
      "resetCycle": "daily"
    },
    "env": [
      {
        "key": "GROQ_API_KEY",
        "secret": true,
        "required": true,
        "pattern": "^gsk_[A-Za-z0-9]+$",
        "description": "Clave API de Groq"
      }
    ],
    "capability": ["prompt", "config", "test"],
    "risks": [
      "Los límites de tasa se aplican por modelo",
      "Comprueba la disponibilidad actual del nivel gratuito antes de usar en producción"
    ]
  }
}
```

## generate_setup_prompt

Genera un prompt de setup de Agent para un servicio. Los servicios estructurados reciben prompts precisos; los no estructurados una plantilla genérica. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `serviceId` | `string` | Sí | ID del servicio o slug |
| `projectSlug` | `string` | No | Identificador de proyecto para nombrar el prompt |

**Salida**

```json
{
  "serviceId": "groq",
  "serviceName": "Groq",
  "prompt": "Eres mi asistente de configuración en navegador.\n\nObjetivo:\nAyúdame a configurar los recursos gratuitos de Groq...\n\nCuando termines, devuelve solo:\nGROQ_API_KEY=...",
  "outputFormat": "GROQ_API_KEY=...",
  "requiredEnvKeys": ["GROQ_API_KEY"],
  "capability": ["prompt", "config", "test"]
}
```

## parse_agent_output

Analiza texto devuelto por Agent y extrae entradas KEY=VALUE. No persiste datos. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `text` | `string` | Sí | Texto sin procesar del Agent |
| `serviceId` | `string` | No | Servicio asociado para validación de formato y mapeo de campos |

**Salida**

```json
{
  "entries": [
    { "key": "GROQ_API_KEY", "value": "gsk_xxx", "secret": true }
  ],
  "notes": ["Se analizó 1 entrada desde el formato KEY=VALUE"],
  "warnings": []
}
```

Error de análisis:

```json
{
  "entries": [],
  "notes": [],
  "warnings": [
    "No se pudo analizar la línea 3: 'some invalid text'"
  ]
}
```

**Formatos de entrada soportados**

- Formato env: `KEY=VALUE`
- Bloque de código Markdown
- Formato con dos puntos: `API Key: abc`, `Endpoint: https://example.com`

## save_agent_output

Analiza la salida del Agent y la persiste en Vault. ⚡ `idempotent`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `serviceId` | `string` | Sí | ID del servicio o slug |
| `text` | `string` | Sí | Texto del Agent |

**Salida**

```json
{
  "saved": [
    { "key": "GROQ_API_KEY", "serviceId": "groq", "scope": "server" }
  ],
  "failed": [],
  "state": "configured"
}
```

Fallo parcial:

```json
{
  "saved": [
    { "key": "SUPABASE_URL", "serviceId": "supabase", "scope": "public" }
  ],
  "failed": [
    {
      "key": "SUPABASE_ANON_KEY",
      "reason": "Coincidencia de patrón fallida: se esperaba ^eyJ..."
    }
  ],
  "state": "configured_unverified"
}
```

## validate_secret

Valida el formato de una clave y devuelve servicios coincidentes. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `key` | `string` | Sí | Nombre de variable de entorno |
| `value` | `string` | Sí | Valor a validar |

**Salida**

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

Lista metadatos de todas las entradas en Vault. **Nunca devuelve valores en texto plano.** 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `serviceId` | `string` | No | Filtro por servicio |

**Salida**

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

Almacena una sola clave. El valor no se devuelve. ⚡ `idempotent`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `key` | `string` | Sí | Nombre de la clave de entorno |
| `value` | `string` | Sí | Valor para almacenar (no se devuelve) |
| `serviceId` | `string` | No | ID del servicio asociado |

**Salida**

```json
{
  "saved": true,
  "key": "GROQ_API_KEY",
  "serviceId": "groq",
  "scope": "server"
}
```

## vault_import

Importa en lote pares KEY=VALUE con análisis, validación y persistencia automáticos. ⚡ `idempotent`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `text` | `string` | Sí | Texto KEY=VALUE multilínea |
| `serviceId` | `string` | No | ID del servicio asociado |

**Salida**

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

Copia el valor de una clave al portapapeles. **El valor nunca se devuelve vía MCP.** ⚡ `idempotent`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `key` | `string` | Sí | Nombre de la clave a copiar |

**Salida**

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

Elimina una clave del almacén de credenciales del sistema. ⚠️ `destructive`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `key` | `string` | Sí | Nombre de la clave a eliminar |

**Salida**

```json
{
  "removed": true,
  "key": "GROQ_API_KEY"
}
```

## vault_health

Comprueba el estado de salud de todas las claves guardadas. 🔒 `readOnly`

**Entrada**

None

**Salida**

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
    "warnings": ["clave solo de servidor: no exponer al frontend"]
    },
    {
      "key": "OPENROUTER_API_KEY",
      "status": "missing",
      "formatValid": null,
      "connection": null,
    "warnings": ["Clave no encontrada en Vault"]
    }
  ]
}
```

## generate_env

Genera archivos de entorno desde Vault. ⚠️ `destructive` (escribe en el sistema de archivos)

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `path` | `string` | No | Ruta de destino, por defecto `.env.local` |
| `example` | `boolean` | No | Genera `.env.example` (solo nombres de claves) |
| `includeUnverified` | `boolean` | No | Incluye entradas no verificadas |

**Salida**

```json
{
  "path": ".env.local",
  "writtenKeys": ["GROQ_API_KEY", "GEMINI_API_KEY", "SUPABASE_URL"],
  "missingKeys": ["OPENROUTER_API_KEY"]
}
```

## test_connection

Ejecuta una prueba de conectividad para el servicio indicado. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `serviceId` | `string` | Sí | ID del servicio o slug |

**Salida**

```json
{
  "serviceId": "groq",
  "ok": true,
  "status": "passed",
  "message": "Conexión exitosa",
  "latencyMs": 234
}
```

```json
{
  "serviceId": "huggingface",
  "ok": false,
  "status": "skipped",
  "message": "El servicio no admite pruebas automáticas",
  "latencyMs": null
}
```

## get_status

Obtiene el resumen global del proyecto actual. 🔒 `readOnly`

**Entrada**

None

**Salida**

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

Recomienda una stack técnica por tipo de proyecto. 🔒 `readOnly`

**Entrada**

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `useCase` | `"ai_saas" \| "rag" \| "blog" \| "agent_tool" \| "mobile_app" \| "custom"` | Sí | Tipo de caso de uso |

**Salida**

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
      "Todos los servicios admiten nivel gratuito",
      "Configura Groq primero: otros servicios pueden depender del flujo de autenticación"
    ]
  }
}
```

## Resumen de herramientas

| Herramienta | Tipo | Descripción |
| --- | --- | --- |
| `list_services` | 🔒 readOnly | Buscar en el catálogo |
| `get_service_info` | 🔒 readOnly | Ver detalles de servicio |
| `generate_setup_prompt` | 🔒 readOnly | Generar prompt de setup de Agent |
| `parse_agent_output` | 🔒 readOnly | Analizar salida de Agent |
| `save_agent_output` | ⚡ idempotent | Guardar salida de Agent en Vault |
| `validate_secret` | 🔒 readOnly | Validar formato de clave |
| `vault_list` | 🔒 readOnly | Listar metadatos de Vault |
| `vault_set` | ⚡ idempotent | Guardar una sola clave |
| `vault_import` | ⚡ idempotent | Importar claves en bloque |
| `vault_copy` | ⚡ idempotent | Copiar clave al portapapeles |
| `vault_remove` | ⚠️ destructive | Eliminar una clave |
| `vault_health` | 🔒 readOnly | Comprobar salud de claves |
| `generate_env` | ⚠️ destructive | Escribir archivo de entorno |
| `test_connection` | 🔒 readOnly | Probar conectividad de servicio |
| `get_status` | 🔒 readOnly | Resumen de estado del proyecto |
| `recommend_stack` | 🔒 readOnly | Recomendar stack |

## Opciones de instalación

### Cursor

```bash
baipiao mcp install cursor
```

**Salida:**

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

**Salida:**

```json
{
  "client": "claude",
  "transport": "http",
  "url": "http://127.0.0.1:7331/mcp",
  "localOnly": true
}
```

> Usa `baipiao mcp --port 7331` para iniciar el servidor HTTP y luego `baipiao mcp install <client> --port 7331` para instalar la configuración de cliente correspondiente.

## Ejemplo de uso

```text
1) Buscar servicios LLM
mcp: list_services { "query": "llm", "capability": "config", "limit": 10 }

2) Obtener detalles de Groq
mcp: get_service_info { "serviceId": "groq" }

3) Generar prompt de setup
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

4) Guardar salida del Agent
mcp: save_agent_output {
  "serviceId": "groq",
  "text": "GROQ_API_KEY=gsk_xxx"
}

5) Verificar estado
mcp: get_status {}

6) Generar env
mcp: generate_env { "example": false }
```
