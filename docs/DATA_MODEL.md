# Data Model

Network Analysis uses a master-detail model.

## Master Table

`network_infra_inventory`

One row per network device. This table describes the infrastructure that can produce telemetry.

Key field:

- `device_id`

Useful dimensions:

- `device_type`
- `site`
- `region`
- `role`
- `vendor`
- `model`
- `criticality`
- `owner_team`
- `status`
- `interfaces`

## Detail Table

`network_telemetry_base`

One row per telemetry event or flow summary.

Join field:

- `network_telemetry_base.device_id`
- `network_infra_inventory.device_id`

## Relationship

```text
network_infra_inventory.device_id 1 -> many network_telemetry_base.device_id
```

This lets you answer questions like:

- Which critical devices have the most anomalies?
- Which sites have the highest packet loss?
- Which vendors or models show high latency?
- Which owner team is responsible for denied flows?
- Which firewall devices block risky ports most often?

## Business Impact Table

`customer_sla_mapping`

One row per customer-facing service dependency. This maps customers and SLA tiers to the network sites and primary devices that support them.

Join fields:

- `customer_sla_mapping.primary_device_id`
- `network_infra_inventory.device_id`

The UI also uses site-level fallback matching when an anomaly touches a device at the same site as a customer service.

Useful fields:

- `customer_name`
- `service_name`
- `sla_tier`
- `sla_target`
- `impact_weight`
- `business_owner`
- `escalation_group`

The Node.js telemetry generator also uses `network_infra_inventory` as the master source for devices. Active devices with `monitoring_enabled` set to `true` are eligible for generated telemetry.

## Example Join

```sql
SELECT
    t.timestamp_utc,
    t.event_id,
    i.site,
    i.device_type,
    i.role,
    i.criticality,
    i.owner_team,
    t.src_ip,
    t.dst_ip,
    t.dst_port,
    t.flow_action,
    t.alert_label
FROM network_telemetry_base t
JOIN network_infra_inventory i
    ON t.device_id = i.device_id
WHERE t.alert_label <> 'normal'
ORDER BY t.timestamp_utc;
```
