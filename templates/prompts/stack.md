# Stack Prompt

## Stack goal

Prepare the selected baipiao free stack for `{{project_slug}}`.

## Services

For each service in the stack:

1. Generate or reuse the service setup prompt.
2. Keep each service output separate.
3. Save only values that match the service output format.

## Safety rules

- Do not enable billing, upgrades, paid plans, or payment methods.
- Keep secrets in Vault and never write cleartext secrets into project status files.
- If an account challenge appears, pause and ask the user to complete it manually.

## Output only format

Return one section per service and keep configuration lines as:

```env
KEY=VALUE
```
