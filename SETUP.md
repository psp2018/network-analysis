# Setup Guide

## 1. Open The Project

Project folder:

```text
C:\Users\ps_pr\Documents\Codex\2026-05-09\my-end-goal-is-to-create\network-analysis
```

You can work on this project in Codex. Your colleague can use Claude, VS Code, GitHub Desktop, or another editor.

## 2. Run The Generator

From the project folder:

```powershell
cd C:\Users\ps_pr\Documents\Codex\2026-05-09\my-end-goal-is-to-create\network-analysis
```

Start the visual network UI:

```powershell
npm.cmd start
```

Then open:

```text
http://localhost:3000
```

Press **Start** in the UI to begin streaming simulated network telemetry.

The UI keeps live events in browser storage, so refreshing the page or restarting the local server will reload the current session in the same browser. Use **Export CSV** to download the session, or **Clear** to delete saved events and anomalies after confirmation.

Anomalies are enriched with business impact from `data/customer_sla_mapping.csv`, including customer name, service, SLA tier, SLA target, business owner, and escalation group.

Generate 100 CSV rows with PowerShell:

```powershell
.\scripts\telemetry_agent.ps1 -Count 100 -AnomalyRate 0.15 -Format csv -Output .\data\generated_network_telemetry.csv
```

If PowerShell blocks scripts on your machine, run this version:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\telemetry_agent.ps1 -Count 100 -AnomalyRate 0.15 -Format csv -Output .\data\generated_network_telemetry.csv
```

If Node.js is installed, you can also use:

```powershell
node .\scripts\telemetry_agent.js --count 100 --anomaly-rate 0.15 --format csv --output .\data\generated_network_telemetry.csv
```

The Node.js generator uses `data/network_infra_inventory.csv` as the device master by default. You can point it to another inventory file with:

```powershell
node .\scripts\telemetry_agent.js --inventory .\data\network_infra_inventory.csv --count 100 --format csv --output .\data\generated_network_telemetry.csv
```

Generate 100 JSON rows with PowerShell:

```powershell
.\scripts\telemetry_agent.ps1 -Count 100 -AnomalyRate 0.15 -Format json -Output .\data\generated_network_telemetry.json
```

## 3. Understand The Options

- `--count` controls how many rows are generated.
- `--anomaly-rate` controls the share of suspicious or abnormal events.
- `--format` can be `csv` or `json`.
- `--inventory` chooses the network infrastructure inventory file.
- `--output` chooses the output file.
- `--seed` makes output repeatable.

In the PowerShell script, these same options use PowerShell-style names:

- `-Count`
- `-AnomalyRate`
- `-Format`
- `-Output`
- `-Seed`

Example:

```powershell
.\scripts\telemetry_agent.ps1 -Count 1000 -AnomalyRate 0.25 -Format csv -Output .\data\generated_network_telemetry.csv -Seed 123
```

## 4. Share With A Colleague

Use GitHub as the shared home for the project.

Recommended simple workflow:

1. Create a GitHub repository named `network-analysis`.
2. Upload or push this project folder.
3. Each person works on a branch.
4. Use pull requests before merging changes.

If Git is available in your terminal:

```powershell
git init
git add .
git commit -m "Initial network analysis project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/network-analysis.git
git push -u origin main
```

If Git feels annoying, use GitHub Desktop:

1. Add this folder as an existing repository.
2. Commit the files.
3. Publish the repository to GitHub.

## 5. How To Use Codex Or Claude Safely

Give each assistant a narrow job.

Good prompt:

```text
In scripts/telemetry_agent.js, add a --scenario option for normal, scan, outage, and backup_window.
Update README.md. Do not change the SQL schema.
```

Avoid vague prompts like:

```text
Make the project better.
```
