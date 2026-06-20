# Network Analysis

Network Analysis is a starter project for generating synthetic network telemetry data.

The project has two parts:

1. A base telemetry table that defines the fields and gives example rows.
2. A starter generator agent that creates new telemetry rows in CSV or JSON format.

## Files

- `data/network_telemetry_base.csv` - curated base telemetry sample.
- `data/network_infra_inventory.csv` - master inventory table for network devices.
- `schema/network_telemetry_base.sql` - SQL table definition.
- `schema/network_infra_inventory.sql` - standalone SQL definition for the inventory table.
- `scripts/telemetry_agent.js` - runnable telemetry generator.
- `scripts/telemetry_agent.ps1` - PowerShell generator for Windows without Node.js.
- `scripts/telemetry_agent.py` - Python version for environments with Python.
- `docs/DATA_MODEL.md` - relationship between infrastructure inventory and telemetry.
- `SETUP.md` - step-by-step usage and collaboration guide.
- `PROJECT_PLAN.md` - recommended next build steps.

## Generate Data

Start the visual UI:

```powershell
npm.cmd start
```

Then open:

```text
http://localhost:3000
```

Generate CSV with PowerShell:

```powershell
.\scripts\telemetry_agent.ps1 -Count 100 -AnomalyRate 0.15 -Format csv -Output .\data\generated_network_telemetry.csv
```

Generate CSV with Node.js:

```powershell
node .\scripts\telemetry_agent.js --count 100 --anomaly-rate 0.15 --format csv --output .\data\generated_network_telemetry.csv
```

The Node.js generator reads devices from `data/network_infra_inventory.csv` by default. To use another inventory file:

```powershell
node .\scripts\telemetry_agent.js --inventory .\data\network_infra_inventory.csv --count 100 --format csv --output .\data\generated_network_telemetry.csv
```

Generate JSON:

```powershell
node .\scripts\telemetry_agent.js --count 100 --anomaly-rate 0.15 --format json --output .\data\generated_network_telemetry.json
```

Generate a repeatable demo file:

```powershell
node .\scripts\telemetry_agent.js --count 25 --anomaly-rate 0.3 --format csv --output .\data\demo_network_telemetry.csv --seed 42
```

## What The Data Represents

The data model has a master-detail shape:

- `network_infra_inventory` is the master table with one row per network device.
- `network_telemetry_base` is the detail table with one row per telemetry event or flow summary.
- The join key is `device_id`.

Important fields include:

- `timestamp_utc`
- `device_id`
- `device_type`
- `site`
- `src_ip`
- `dst_ip`
- `protocol`
- `bytes_in`
- `bytes_out`
- `latency_ms`
- `jitter_ms`
- `packet_loss_pct`
- `flow_action`
- `alert_label`

The data is synthetic and uses private IP ranges plus public documentation ranges for safe external examples.
