import argparse
import csv
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path


DEVICES = [
    {"device_id": "edge-rtr-01", "device_type": "router", "site": "zurich-hq", "interfaces": ["ge-0/0/1", "ge-0/0/2"]},
    {"device_id": "edge-rtr-02", "device_type": "router", "site": "geneva-branch", "interfaces": ["ge-0/0/0", "ge-0/0/1"]},
    {"device_id": "core-sw-01", "device_type": "switch", "site": "zurich-hq", "interfaces": ["xe-0/1/0", "xe-0/1/2", "xe-0/1/3"]},
    {"device_id": "core-sw-02", "device_type": "switch", "site": "zurich-hq", "interfaces": ["xe-0/1/1", "xe-0/1/2"]},
    {"device_id": "fw-hq-01", "device_type": "firewall", "site": "zurich-hq", "interfaces": ["wan0", "lan0"]},
    {"device_id": "fw-branch-02", "device_type": "firewall", "site": "basel-branch", "interfaces": ["wan1", "lan1"]},
    {"device_id": "ap-floor1-03", "device_type": "access_point", "site": "zurich-hq", "interfaces": ["wlan0"]},
    {"device_id": "ap-floor3-07", "device_type": "access_point", "site": "zurich-hq", "interfaces": ["wlan0"]},
]

NORMAL_PORTS = [53, 80, 123, 443, 5432, 6379]
RISKY_PORTS = [22, 23, 445, 3389, 8080]
FIELDNAMES = [
    "event_id",
    "timestamp_utc",
    "device_id",
    "device_type",
    "site",
    "src_ip",
    "dst_ip",
    "src_port",
    "dst_port",
    "protocol",
    "interface",
    "bytes_in",
    "bytes_out",
    "packets_in",
    "packets_out",
    "latency_ms",
    "jitter_ms",
    "packet_loss_pct",
    "cpu_util_pct",
    "memory_util_pct",
    "session_state",
    "flow_action",
    "alert_label",
]


def private_ip(site):
    site_prefix = {
        "zurich-hq": "10.10",
        "geneva-branch": "10.40",
        "basel-branch": "10.30",
    }[site]
    return f"{site_prefix}.{random.randint(1, 30)}.{random.randint(2, 240)}"


def documentation_public_ip():
    network = random.choice(["192.0.2", "198.51.100", "203.0.113"])
    return f"{network}.{random.randint(1, 240)}"


def event_label(dst_port, flow_action, latency_ms, device_type):
    if flow_action == "deny":
        labels = {
            22: "suspicious_ssh",
            23: "blocked_telnet",
            445: "blocked_smb",
            3389: "blocked_rdp",
            8080: "blocked_scan",
        }
        return labels.get(dst_port, "blocked_connection")
    if latency_ms >= 65:
        return "high_latency"
    if device_type == "access_point" and latency_ms >= 24:
        return "high_wireless_load"
    return "normal"


def generate_row(index, timestamp, anomaly_rate):
    device = random.choice(DEVICES)
    is_anomaly = random.random() < anomaly_rate
    protocol = random.choices(["TCP", "UDP"], weights=[0.75, 0.25])[0]
    dst_port = random.choice(RISKY_PORTS if is_anomaly else NORMAL_PORTS)
    flow_action = "deny" if is_anomaly and device["device_type"] == "firewall" else "allow"

    if flow_action == "deny":
        src_ip = documentation_public_ip()
        dst_ip = private_ip(device["site"])
        bytes_out = 0
        packets_out = 0
        session_state = "syn_sent"
    else:
        src_ip = private_ip(device["site"])
        dst_ip = private_ip("zurich-hq") if random.random() < 0.65 else documentation_public_ip()
        bytes_out = random.randint(400, 600000)
        packets_out = max(1, bytes_out // random.randint(420, 1100))
        session_state = random.choice(["established", "closed", "fin_wait"])

    if is_anomaly:
        latency_ms = round(random.uniform(60.0, 115.0), 1)
        jitter_ms = round(random.uniform(8.0, 24.0), 1)
        packet_loss_pct = round(random.uniform(1.0, 4.0), 1)
        cpu_util_pct = round(random.uniform(55.0, 82.0), 1)
        memory_util_pct = round(random.uniform(64.0, 78.0), 1)
    else:
        latency_ms = round(random.uniform(2.0, 40.0), 1)
        jitter_ms = round(random.uniform(0.2, 7.5), 1)
        packet_loss_pct = round(random.uniform(0.0, 0.5), 1)
        cpu_util_pct = round(random.uniform(18.0, 55.0), 1)
        memory_util_pct = round(random.uniform(40.0, 66.0), 1)

    bytes_in = random.randint(300, 250000)
    packets_in = max(1, bytes_in // random.randint(420, 1100))

    return {
        "event_id": f"evt-{index:06d}",
        "timestamp_utc": timestamp.isoformat().replace("+00:00", "Z"),
        "device_id": device["device_id"],
        "device_type": device["device_type"],
        "site": device["site"],
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": random.randint(49152, 65535),
        "dst_port": dst_port,
        "protocol": protocol,
        "interface": random.choice(device["interfaces"]),
        "bytes_in": bytes_in,
        "bytes_out": bytes_out,
        "packets_in": packets_in,
        "packets_out": packets_out,
        "latency_ms": latency_ms,
        "jitter_ms": jitter_ms,
        "packet_loss_pct": packet_loss_pct,
        "cpu_util_pct": cpu_util_pct,
        "memory_util_pct": memory_util_pct,
        "session_state": session_state,
        "flow_action": flow_action,
        "alert_label": event_label(dst_port, flow_action, latency_ms, device["device_type"]),
    }


def generate_rows(count, anomaly_rate, start_time):
    timestamp = start_time
    rows = []
    for index in range(1, count + 1):
        rows.append(generate_row(index, timestamp, anomaly_rate))
        timestamp += timedelta(seconds=random.choice([5, 10, 15, 30]))
    return rows


def write_csv(rows, output_path):
    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_json(rows, output_path):
    output_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")


def parse_args():
    parser = argparse.ArgumentParser(description="Generate synthetic network telemetry data.")
    parser.add_argument("--count", type=int, default=100, help="Number of rows to generate.")
    parser.add_argument("--anomaly-rate", type=float, default=0.15, help="Fraction of anomalous events from 0.0 to 1.0.")
    parser.add_argument("--format", choices=["csv", "json"], default="csv", help="Output format.")
    parser.add_argument("--output", default=None, help="Output file path.")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for repeatable output.")
    return parser.parse_args()


def main():
    args = parse_args()
    if not 0.0 <= args.anomaly_rate <= 1.0:
        raise ValueError("--anomaly-rate must be between 0.0 and 1.0")
    if args.count < 1:
        raise ValueError("--count must be at least 1")
    if args.seed is not None:
        random.seed(args.seed)

    start_time = datetime(2026, 5, 9, 8, 0, tzinfo=timezone.utc)
    rows = generate_rows(args.count, args.anomaly_rate, start_time)

    default_name = f"generated_network_telemetry.{args.format}"
    output_path = Path(args.output or default_name)
    if args.format == "csv":
        write_csv(rows, output_path)
    else:
        write_json(rows, output_path)

    print(f"Wrote {len(rows)} rows to {output_path}")


if __name__ == "__main__":
    main()
