# Configured Service Prompt

## Goal

Configure `{{service_name}}` for `{{project_slug}}` using the documented free-tier path.

## Entry page

Open `{{entry_page}}`.

## Steps

1. Use the project name `{{project_name}}` where a project, app, bucket, or workspace name is required.
2. Follow only the documented setup steps for this service.
3. Create or copy only the values requested in the output format.

## Safety rules

- If login, CAPTCHA, email verification, or 2FA is required, pause and ask the user to complete it manually.
- Do not click Billing, Upgrade, Payment, Subscribe, Add payment method, or enable paid features.
- Do not save website login passwords.
- Do not invent unknown values.

## Output only format

Return only configuration lines:

```env
KEY=VALUE
```
