# Project Plan

## Goal

Build an agent that creates realistic synthetic network telemetry data for network analysis, demos, testing, and detection experiments.

## Current Capabilities

- Base telemetry CSV table.
- Network infrastructure inventory master table.
- SQL schema.
- JavaScript generator agent.
- CSV and JSON output.
- Configurable row count and anomaly rate.
- Optional random seed for repeatable output.

## Next Milestones

### 1. Scenario Generation

Add scenario types:

- Normal business traffic
- Port scan
- Brute-force attempt
- Network outage
- Backup window
- High wireless load

### 2. Plain-Language Agent

Let the user request data in natural language:

```text
Generate 5,000 rows for Zurich HQ with 20 percent anomalies and a port scan pattern.
```

The agent should translate that into generator settings.

### 3. Validation

Add checks that generated rows:

- Match the schema.
- Have increasing timestamps.
- Use safe synthetic IP ranges.
- Keep metrics within realistic ranges.
- Label anomalies consistently.

### 4. Output Targets

Add export options:

- CSV
- JSON
- SQL insert statements
- Parquet later, if needed

### 5. Interface

Possible interfaces:

- Command line only
- Small local web app
- API endpoint
- Notebook for analysis

## Suggested First Issues

1. Add `--scenario`.
2. Add row validation.
3. Add SQL insert output.
4. Add README examples.
5. Add sample anomaly explanations.
