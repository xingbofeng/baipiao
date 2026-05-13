# Generic Service Prompt

## Goal

Find whether `{{service_name}}` exposes free-tier configuration values that can be used by `{{project_slug}}`.

## Entry page

Open `{{homepage_url}}`.

## Steps

1. Review public docs, dashboard settings, API key pages, endpoints, project settings, database URLs, tokens, or connection strings if available.
2. Prefer official docs and account pages linked from the homepage.
3. If the service has no usable configuration values, say that no configuration values were found.

## Safety rules

- If login, CAPTCHA, email verification, or 2FA is required, pause and ask the user to complete it manually.
- Do not click Billing, Upgrade, Payment, Subscribe, Add payment method, or enable paid features.
- Do not invent unknown values.
- Do not output account passwords, cookies, or unrelated personal data.

## Output only format

Return only configuration lines:

```env
KEY=VALUE
```
