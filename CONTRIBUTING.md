# Contributing

This project is meant to be shared by people using different tools: Codex, Claude, VS Code, GitHub Desktop, or a normal terminal.

## Workflow

1. Pull the latest project version.
2. Create a branch for each change.
3. Keep changes small.
4. Test the generator before sharing changes.
5. Open a pull request for review.

## Branch Examples

- `feature/scenario-generation`
- `feature/plain-language-agent`
- `feature/sql-output`
- `test/schema-validation`
- `docs/setup-guide`

## Assistant Rules

When using an AI assistant, tell it:

- The exact goal.
- The files it may edit.
- The files it should avoid.
- How to verify the change.

Example:

```text
Add CSV validation to scripts/telemetry_agent.js.
You may edit scripts/telemetry_agent.js and README.md.
Do not change data/network_telemetry_base.csv or schema/network_telemetry_base.sql.
Verify by generating 20 rows.
```

## Data Rules

- Use synthetic data only.
- Do not add real network logs.
- Keep external IP examples in documentation ranges:
  - `192.0.2.0/24`
  - `198.51.100.0/24`
  - `203.0.113.0/24`
- Keep the CSV and SQL schema aligned.
