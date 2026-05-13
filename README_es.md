# baipiao

**Un configurador de stacks gratuitas, agent-native, para desarrolladores.**

![Agent Native](https://img.shields.io/badge/agent--native-111827?style=flat-square)
![MCP Ready](https://img.shields.io/badge/MCP-ready-2563eb?style=flat-square)
![Local Vault](https://img.shields.io/badge/local--vault-secure-16a34a?style=flat-square)
![Free Stack](https://img.shields.io/badge/free--stack-configurator-7c3aed?style=flat-square)

[Website](https://baipiao.counterxing.top) · [Documentation](https://baipiao.counterxing.top/docs/es) · [English](./README.md) · [中文](./README_zh.md) · [日本語](./README_ja.md) · [한국어](./README_ko.md) · [Français](./README_fr.md) · [Español](./README_es.md)

baipiao organiza la infraestructura gratuita para desarrolladores y la convierte en un flujo de trabajo claro, asistido por agentes.

Descubres servicios gratuitos, generas un prompt de configuración preciso, se lo pasas a Codex / Claude Code / Cursor, recuperas las claves, las guardas en un Vault local, generas `.env`, pruebas la conexión y expones todo por MCP.

![baipiao product demo](./docs/assets/product-demo-english.gif)

## Why It Exists

Con las capas gratuitas se puede avanzar muchísimo: API LLM, bases de datos, almacenamiento de objetos, hosting, auth, email, monitoring, bases vectoriales y más.

El problema no es que falten servicios. El problema es la fricción operativa.

Cada servicio tiene su consola, su página de claves API, su modelo de cuota, su flujo de onboarding, su formato de variables de entorno y sus convenciones de seguridad. Los agentes de IA ayudan, pero necesitan una tarea estructurada, un límite seguro y un lugar para devolver el resultado.

baipiao es esa capa de control.

## The Loop

![baipiao agent setup loop](./docs/assets/agent-setup-loop.svg)

## Product Principles

- **Agent-first, human-approved**: baipiao prepara el trabajo; el usuario mantiene el control sobre login, verificación y acciones sensibles.
- **Local by default**: los secretos viven en el almacén local del sistema, no en un panel alojado.
- **Prompt to production**: los prompts generados no son notas; son briefs ejecutables para agentes.
- **Structured where it matters**: los servicios conocidos obtienen validación, generación de env, pruebas de conexión y un reporte de estado más seguro.
- **MCP-native**: Codex, Claude Code, Cursor y otros clientes MCP pueden llamar a baipiao sin recibir valores secretos en claro.

## What It Does

| Capability | Description |
|---|---|
| Service catalog | Busca servicios gratuitos para IA, backend, hosting, almacenamiento, auth y más. |
| Full catalog localization | Consulta candidatos por palabra clave/categoría e importa traducciones zh-CN / ja / ko / fr / es. |
| Agent setup prompts | Genera instrucciones específicas de configuración para cada servicio. |
| Agent output parser | Acepta salidas `KEY=VALUE` y normaliza la configuración. |
| Local Vault | Guarda API keys, tokens, endpoints, IDs de proyecto y cadenas de conexión en el almacén del sistema. |
| Env generation | Produce `.env.local` y `.env.example` a partir de la configuración guardada. |
| Connection tests | Verifica los servicios soportados antes de usarlos en el stack. |
| MCP server | Expone herramientas seguras de setup / registry / Vault / env / test / status. |

## Quick Start

```bash
npm i -g baipiao
```

O ejecútalo directamente:

```bash
npx baipiao init
```

Si trabajas desde un checkout local y aún no tienes el binario global `baipiao`, usa el entrypoint compilado del CLI:

```bash
pnpm build
node packages/cli/dist/index.js init
```

Luego:

```bash
baipiao init
baipiao search llm
baipiao search openruter
baipiao search database
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
baipiao status
```

## CLI Preview

![baipiao CLI preview](./docs/assets/cli-four-panel-preview.png)

## Integración MCP

Con MCP, Codex, Claude Code, Cursor y otros clientes Agent pueden consultar el catálogo completo importado desde free-for-dev, inspeccionar candidatos localizados, generar prompts de configuración y leer estado seguro del proyecto sin recibir secretos en claro.

![Ejemplo de integración MCP de baipiao](./docs/assets/mcp-integration-zh.png)

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

Genera un prompt de configuración:

```bash
baipiao setup groq
```

baipiao entrega al agente un prompt específico del servicio. Cuando termina la configuración web, el agente devuelve:

```env
GROQ_API_KEY=gsk_xxx
```

Después baipiao valida, guarda, escribe y prueba el resultado:

```text
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
✓ Connection test passed
```

## Vault

baipiao trata los secretos como infraestructura de producto, no como residuos del portapapeles.

```bash
baipiao vault list
baipiao vault set GROQ_API_KEY
baipiao vault import
baipiao vault copy GROQ_API_KEY
baipiao vault reveal GROQ_API_KEY
baipiao vault health
```

Almacenamiento por defecto:

| Platform | Store |
|---|---|
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Secret Service |

Reglas de seguridad:

- `vault list` nunca imprime valores secretos en claro.
- `vault copy` usa el portapapeles en lugar de la salida del terminal.
- `vault reveal` requiere confirmación explícita.
- Las herramientas MCP no exponen secretos en claro.
- Los logs y estados generados están diseñados para evitar fugas de claves.

## MCP

Inicia el servidor MCP:

```bash
baipiao mcp
```

Instálalo en un cliente:

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

Ejemplo de configuración del cliente:

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

Familias de herramientas MCP disponibles:

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

MCP no ofrece deliberadamente herramientas como `vault_reveal`, `get_secret_value`, control del navegador, ejecución de shell o subida de secretos.

## Boundaries

baipiao no:

- Guarda contraseñas de inicio de sesión web.
- Elude CAPTCHA, 2FA, verificación por teléfono o controles de riesgo.
- Registra cuentas automáticamente.
- Hace clic en Billing, Upgrade, Payment, Subscribe o acciones de planes de pago.
- Sube secretos a un servicio remoto de baipiao.

## Disclaimer

baipiao es una herramienta independiente para desarrolladores y no está afiliada con los servicios de terceros que puede referenciar. La disponibilidad gratuita, las cuotas, los precios, el comportamiento de la API y los términos de los proveedores pueden cambiar en cualquier momento.

Eres responsable de revisar los términos de cada proveedor, proteger tus credenciales y decidir qué acciones puede realizar un agente. baipiao ayuda a estructurar los flujos de configuración, pero no garantiza disponibilidad, gratuidad, cumplimiento de seguridad ni idoneidad legal.

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

El catálogo completo de candidatos gratuitos de baipiao está inspirado en free-for-dev y deriva de sus datos.
