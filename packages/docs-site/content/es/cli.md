---
translationStatus: translated
---
# CLI

`baipiao` es la interfaz de línea de comandos. Cada comando puede ejecutarse de forma independiente o encadenarse en un flujo de configuración completo.

## Inicio rápido

Instala y configura tu primer servicio:

```bash
# Instalar la CLI
npm install -g baipiao

# Inicializar el proyecto actual
baipiao init --name my-ai-tool

# Buscar servicios LLM gratuitos
baipiao search llm

# Generar un prompt de setup y capturar la salida del Agent
baipiao setup groq

# Generar .env.local desde Vault
baipiao env generate

# Probar conectividad con Groq
baipiao test groq
```

Consulta el catálogo completo gratuito:

```bash
# Buscar en el catálogo de candidatos por palabra clave
baipiao catalog candidates --query openrouter

# Filtrar por categoría normalizada
baipiao catalog candidates --category llm

# Devolver campos de candidatos en la localización solicitada
baipiao catalog candidates --locale zh-CN
```

## init

```text
baipiao init [--name <name>]
```

Inicializa el contexto del proyecto y crea el esqueleto del directorio `.baipiao/`.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `--name` | `<string>` | Nombre del proyecto, también usado como slug. Si se omite, se usa el nombre del directorio actual |

**Salida**

```text
✓ Inicializado baipiao en /home/user/my-ai-tool
  Creado .baipiao/project.json
  Creado .baipiao/services.json
  Creado .env.local
  Creado .env.example
```

Cuando ya está inicializado:

```text
⚠ El proyecto ya está inicializado en /home/user/my-ai-tool
```

**Ejemplos**

```bash
baipiao init
baipiao init --name my-ai-tool
```

## search

```text
baipiao search <query>
```

Busca en el catálogo completo `free-for-dev` por palabra clave o categoría, con fuzzy search y palabras clave multilingües.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<query>` | `string` | Palabra clave de búsqueda. Acepta categorías, nombres de servicio, escritura aproximada y consultas multilingües |

**Salida**

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

Etiquetas de capacidad:

| Etiqueta | Significado |
| --- | --- |
| `prompt` | Puede generar un prompt de setup para el Agent |
| `config` | Puede validar y persistir claves de entorno estructuradas |
| `test` | Puede probar conectividad automáticamente |

**Ejemplos**

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

Búsqueda completa de candidatos de `free-for-dev` y flujo de localización offline. `candidates` devuelve el catálogo normalizado completo con filtros por palabra clave/categoría; `categories` devuelve conteos por categoría; `translation-batch` exporta campos para traducción; `localize` escribe traducciones en `enrichment.localization`.

Localizaciones compatibles:

| Localización | Significado |
| --- | --- |
| `en` | Fuente en inglés |
| `zh-CN` | Chino simplificado |
| `ja` | Japonés |
| `ko` | Coreano |
| `fr` | Francés |
| `es` | Español |

**Ejemplos**

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

Muestra metadatos del servicio: enlaces, claves de entorno, detalles del nivel gratuito y notas de riesgo.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<service>` | `string` | ID del servicio o slug (por ejemplo `groq`, `openrouter`, `supabase`) |

**Salida**

```text
Groq

  Categoría    llm
  Página principal    https://groq.com
  Consola     https://console.groq.com
  Claves API    https://console.groq.com/keys
  Documentos        https://console.groq.com/docs

  Nivel gratuito
  Nivel gratuito con límites de tasa para modelos compatibles.
  Requiere tarjeta de crédito: No
  Ciclo de reinicio: diario

  Variables de entorno
  GROQ_API_KEY (secreto, obligatorio)
    Patrón: ^gsk_[A-Za-z0-9]+$

  Capacidades
  prompt  config  test

  Riesgos
  • Los límites de tasa se aplican por modelo
  • Verifica la disponibilidad actual del nivel gratuito antes de usar en producción
```

**Ejemplos**

```bash
baipiao info groq
baipiao info supabase
```

## prompt

```text
baipiao prompt <service> [--copy]
```

Genera un prompt de setup seguro para el Agent. Los servicios estructurados (con configuración YAML) generan prompts precisos; los no estructurados reciben una plantilla genérica.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<service>` | `string` | ID del servicio o slug |
| `--copy` | `boolean` | Copia el prompt generado al portapapeles del sistema |

**Salida** (servicio estructurado — ejemplo Groq)

```text
Eres mi asistente de configuración de navegador.

Objetivo:
Ayúdame a configurar los recursos de nivel gratuito de Groq y crea la
clave API requerida.

Página de entrada:
https://console.groq.com/keys

Pasos:
1. Si no has iniciado sesión, pausa y pídeme que complete el inicio de sesión, CAPTCHA,
   verificación de correo electrónico o 2FA.
2. Crea una nueva clave API.
3. Usa el nombre baipiao-${project_slug}.
4. Copia la clave API generada.

Normas de seguridad:
• No pidas ni guardes mi contraseña de inicio de sesión web.
• No eludas CAPTCHA, 2FA, verificación telefónica o controles de riesgo de la plataforma.
• No hagas clic en facturación, actualizar, pago, suscribirte o añadir método de pago.
• No habilites ninguna función de pago.

Cuando termines, devuelve solo:
GROQ_API_KEY=...
```

**Ejemplos**

```bash
baipiao prompt groq
baipiao prompt groq --copy
baipiao prompt huggingface # resuelve el candidato gratuito huggingface.co
```

## setup

```text
baipiao setup <service>
```

Flujo interactivo de configuración completo: genera el prompt → espera la salida del Agent → parsea → valida → persiste → escribe env → prueba.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<service>` | `string` | ID del servicio o slug |

**Flujo interactivo**

```text
$ baipiao setup groq

→ Generando prompt de setup para Groq...
✓ Prompt copiado al portapapeles

Pega aquí la salida del Agent (termina con una línea vacía):
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

✓ Analizada 1 entrada
✓ Formato de GROQ_API_KEY válido
✓ Guardado en Vault
✓ Añadido a .env.local
→ Ejecutando prueba de conexión...
✓ Prueba de conexión correcta (latencia: 234ms)

Estado: probado
```

**Máquina de estados**

```text
no_iniciado → prompt_generated → agent_output_received
  → configured_unverified → configured → tested
```

**Ejemplos**

```bash
baipiao setup groq
baipiao setup supabase
```

## output

```text
baipiao output <service> [--input <text>]
```

Mismo punto de entrada que `setup`, para importar la salida del Agent desde fuentes externas.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<service>` | `string` | ID del servicio o slug |
| `--input` | `<string>` | Pasa texto KEY=VALUE directamente, saltando el pegado interactivo |

**Formatos de entrada soportados**

- Formato env: `KEY=VALUE`
- Bloque de código delimitado:
  ````text
  ```env
  GROQ_API_KEY=gsk_xxx
  ```
  ````
- Formato con dos puntos: `API Key: abc`, `Endpoint: https://example.com`

**Ejemplos**

```bash
baipiao output groq
baipiao output groq --input "GROQ_API_KEY=gsk_xxx"
```

## env generate

```text
baipiao env generate [--example] [--include-unverified]
```

Lee la configuración almacenada en Vault y escribe archivos de variables de entorno.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `--example` | `boolean` | Escribe `.env.example` (solo nombres de claves, sin valores) |
| `--include-unverified` | `boolean` | Incluye configuración no verificada con avisos de riesgo |

**Salida**

```text
$ baipiao env generate
✓ .env.local escrito
  Claves: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

$ baipiao env generate --example
✓ .env.example escrito
  Claves: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
```

**Ejemplos**

```bash
baipiao env generate
baipiao env generate --example
baipiao env generate --include-unverified
```

## test

```text
baipiao test [<service>]
```

Prueba conectividad del servicio. Si no se especifica servicio, se prueban todos los servicios rastreados del proyecto actual.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<service>` | `string` | Opcional. ID del servicio o slug |

**Salida**

```text
$ baipiao test groq

Groq
  Tipo de prueba: openai_compatible_chat
  Estado: aprobado
  Latencia: 234ms

$ baipiao test free-for-dev:apis-data-and-ml:huggingface-co

Hugging Face candidate
  Tipo de prueba: no compatible
  Estado: omitido
```

**Tipos de prueba soportados**

| Tipo | Descripción |
| --- | --- |
| `openai_compatible_chat` | Envía una solicitud de chat completion para validar la clave API (Groq, OpenRouter) |
| `http` | Validación HTTP GET/POST (Gemini) |
| `supabase` | Valida URL de Supabase + Anon Key |
| `s3_compatible` | Valida conectividad de almacenamiento compatible con S3 (Cloudflare R2) |

**Ejemplos**

```bash
baipiao test
baipiao test groq
baipiao test supabase
```

## status

```text
baipiao status
```

Muestra un resumen global del estado del proyecto actual.

**Salida**

```text
Estado de baipiao

Proyecto
  Nombre     my-ai-tool
  Slug       my-ai-tool
  Ruta env   .env.local

Servicios
  groq            tested
  openrouter      not_started
  gemini          configured
  supabase        tested

Vault
  Total entradas   6
  Guardadas       5
  Faltantes       1

Acciones rápidas
  baipiao setup openrouter
  baipiao vault health
  baipiao env generate
```

**Ejemplos**

```bash
baipiao status
```

## stack recommend

```text
baipiao stack recommend <type>
```

Recomienda una stack técnica gratuita según el tipo de proyecto.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | Tipo de proyecto |

**Salida**

```text
$ baipiao stack recommend ai_saas

Stack recomendado: AI SaaS

  LLM         groq / openrouter
  Base de datos    supabase
  Almacenamiento  cloudflare-r2
  Autenticación  clerk
  Correo         resend
  Monitoring  (ninguno recomendado)
```

**Ejemplos**

```bash
baipiao stack recommend ai_saas
baipiao stack recommend rag
baipiao stack recommend blog
```

## setup-stack

```text
baipiao setup-stack <type>
```

Emite secciones de prompts de setup para cada servicio de la stack recomendada.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | Tipo de proyecto |

**Ejemplos**

```bash
baipiao setup-stack ai_saas
```

## vault

```text
baipiao vault [<subcommand>]
```

Centro unificado de gestión de secretos. Sin subcomando, muestra el resumen general de Vault.

### vault list

```text
baipiao vault list [--service <service>]
```

Lista el estado de todas las claves. No se muestran valores en texto plano.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `--service` | `<string>` | Opcional. Filtra por servicio |

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

Almacena manualmente una sola clave. La entrada se oculta.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<KEY>` | `string` | Nombre de la clave de entorno |
| `--service` | `<string>` | Opcional. ID de servicio asociado |

```text
$ baipiao vault set GROQ_API_KEY
Introduce el valor de GROQ_API_KEY: ********
✓ GROQ_API_KEY guardado en Vault
✓ Servicio coincidente: groq
```

### vault import

```text
baipiao vault import [--service <service>]
```

Importa en lote texto KEY=VALUE, analizando, validando y persistiéndolo.

```text
$ baipiao vault import
Pegue líneas KEY=VALUE (terminar con línea vacía):
GROQ_API_KEY=gsk_xxx
GEMINI_API_KEY=xxx

✓ Analizadas 2 entradas
✓ GROQ_API_KEY guardado
✓ GEMINI_API_KEY guardado
```

### vault copy

```text
baipiao vault copy <KEY>
```

Copia el valor especificado al portapapeles. Nunca se imprime en la terminal.

```text
$ baipiao vault copy GROQ_API_KEY
✓ GROQ_API_KEY copiado al portapapeles
✓ El portapapeles se limpiará en 30 segundos
```

### vault reveal

```text
baipiao vault reveal <KEY>
```

Muestra el valor en texto plano en la terminal. **Requiere confirmación explícita.** No se expone en MCP.

```text
$ baipiao vault reveal GROQ_API_KEY
Esto imprimirá el valor secreto en tu terminal. ¿Continuar? y/N
```

### vault remove

```text
baipiao vault remove <KEY>
```

Elimina la clave especificada del almacén de credenciales del sistema.

```text
$ baipiao vault remove GROQ_API_KEY
✓ GROQ_API_KEY eliminado de Vault
⚠ Esta clave aún aparece en .env.local. ¿Eliminarla? y/N
```

### vault health

```text
baipiao vault health
```

Comprueba el estado y la validez de formato de todas las claves guardadas.

```text
✓ GROQ_API_KEY              formato válido / conexión correcta
! OPENROUTER_API_KEY        faltante
✓ GEMINI_API_KEY            formato válido / conexión correcta
! SUPABASE_SERVICE_ROLE_KEY solo servidor, no lo expongas al frontend
```

## mcp

```text
baipiao mcp
baipiao mcp --dry-run
```

Inicia el servidor MCP en modo stdio para herramientas de IA.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `--dry-run` | `boolean` | Comprueba preparación sin iniciar el servidor real |

**Ejemplos**

```bash
baipiao mcp
baipiao mcp --dry-run
```

## mcp install

```text
baipiao mcp install <client> [--port <port>]
```

Instala baipiao en el cliente MCP objetivo. El comando actualiza la configuración del cliente directamente.

| Argumento | Tipo | Descripción |
| --- | --- | --- |
| `<client>` | `cursor \| claude \| codex` | Herramienta de coding IA objetivo |
| `--port` | `<number>` | Instala una configuración HTTP que apunta a `http://127.0.0.1:<port>/mcp` |

**Mapa de configuración manual** (stdio)

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

**Mapa de configuración manual** (HTTP)

```json
{
  "mcpServers": {
    "baipiao": {
      "url": "http://127.0.0.1:7331/mcp"
    }
  }
}
```

## Seguridad

- Nunca automatiza facturación, actualización o clics de suscripción
- Nunca guarda contraseñas de inicio de sesión web
- Nunca pasa por alto CAPTCHA, 2FA, verificación telefónica o checks de riesgo de la plataforma
- `vault list` no muestra valores en texto plano; `vault copy` usa portapapeles
- MCP no expone endpoints peligrosos (`vault_reveal`, `get_secret_value`, `shell_exec`, `browser_click`)
