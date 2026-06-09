const fs = require("fs");
const path = require("path");

const devices = [
  { device_id: "edge-rtr-01", device_type: "router", site: "zurich-hq", interfaces: ["ge-0/0/1", "ge-0/0/2"] },
  { device_id: "edge-rtr-02", device_type: "router", site: "geneva-branch", interfaces: ["ge-0/0/0", "ge-0/0/1"] },
  { device_id: "core-sw-01", device_type: "switch", site: "zurich-hq", interfaces: ["xe-0/1/0", "xe-0/1/2", "xe-0/1/3"] },
  { device_id: "core-sw-02", device_type: "switch", site: "zurich-hq", interfaces: ["xe-0/1/1", "xe-0/1/2"] },
  { device_id: "fw-hq-01", device_type: "firewall", site: "zurich-hq", interfaces: ["wan0", "lan0"] },
  { device_id: "fw-branch-02", device_type: "firewall", site: "basel-branch", interfaces: ["wan1", "lan1"] },
  { device_id: "ap-floor1-03", device_type: "access_point", site: "zurich-hq", interfaces: ["wlan0"] },
  { device_id: "ap-floor3-07", device_type: "access_point", site: "zurich-hq", interfaces: ["wlan0"] },
];

const normalPorts = [53, 80, 123, 443, 5432, 6379];
const riskyPorts = [22, 23, 445, 3389, 8080];
const fieldNames = [
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
];

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseArgs(argv) {
  const args = {
    count: 100,
    anomalyRate: 0.15,
    format: "csv",
    output: null,
    seed: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--count") {
      args.count = Number(value);
      i += 1;
    } else if (key === "--anomaly-rate") {
      args.anomalyRate = Number(value);
      i += 1;
    } else if (key === "--format") {
      args.format = value;
      i += 1;
    } else if (key === "--output") {
      args.output = value;
      i += 1;
    } else if (key === "--seed") {
      args.seed = Number(value);
      i += 1;
    }
  }

  if (!Number.isInteger(args.count) || args.count < 1) {
    throw new Error("--count must be a positive integer");
  }
  if (Number.isNaN(args.anomalyRate) || args.anomalyRate < 0 || args.anomalyRate > 1) {
    throw new Error("--anomaly-rate must be between 0.0 and 1.0");
  }
  if (!["csv", "json"].includes(args.format)) {
    throw new Error("--format must be csv or json");
  }
  return args;
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function intBetween(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function decimalBetween(random, min, max) {
  return Number((random() * (max - min) + min).toFixed(1));
}

function privateIp(random, site) {
  const prefixes = {
    "zurich-hq": "10.10",
    "geneva-branch": "10.40",
    "basel-branch": "10.30",
  };
  return `${prefixes[site]}.${intBetween(random, 1, 30)}.${intBetween(random, 2, 240)}`;
}

function documentationPublicIp(random) {
  return `${pick(random, ["192.0.2", "198.51.100", "203.0.113"])}.${intBetween(random, 1, 240)}`;
}

function eventLabel(dstPort, flowAction, latencyMs, deviceType) {
  if (flowAction === "deny") {
    return {
      22: "suspicious_ssh",
      23: "blocked_telnet",
      445: "blocked_smb",
      3389: "blocked_rdp",
      8080: "blocked_scan",
    }[dstPort] || "blocked_connection";
  }
  if (latencyMs >= 65) return "high_latency";
  if (deviceType === "access_point" && latencyMs >= 24) return "high_wireless_load";
  return "normal";
}

function generateRow(random, index, timestamp, anomalyRate) {
  const device = pick(random, devices);
  const isAnomaly = random() < anomalyRate;
  const protocol = random() < 0.75 ? "TCP" : "UDP";
  const dstPort = pick(random, isAnomaly ? riskyPorts : normalPorts);
  const flowAction = isAnomaly && device.device_type === "firewall" ? "deny" : "allow";
  let srcIp;
  let dstIp;
  let bytesOut;
  let packetsOut;
  let sessionState;

  if (flowAction === "deny") {
    srcIp = documentationPublicIp(random);
    dstIp = privateIp(random, device.site);
    bytesOut = 0;
    packetsOut = 0;
    sessionState = "syn_sent";
  } else {
    srcIp = privateIp(random, device.site);
    dstIp = random() < 0.65 ? privateIp(random, "zurich-hq") : documentationPublicIp(random);
    bytesOut = intBetween(random, 400, 600000);
    packetsOut = Math.max(1, Math.floor(bytesOut / intBetween(random, 420, 1100)));
    sessionState = pick(random, ["established", "closed", "fin_wait"]);
  }

  const latencyMs = isAnomaly ? decimalBetween(random, 60, 115) : decimalBetween(random, 2, 40);
  const bytesIn = intBetween(random, 300, 250000);

  return {
    event_id: `evt-${String(index).padStart(6, "0")}`,
    timestamp_utc: timestamp.toISOString().replace(".000Z", "Z"),
    device_id: device.device_id,
    device_type: device.device_type,
    site: device.site,
    src_ip: srcIp,
    dst_ip: dstIp,
    src_port: intBetween(random, 49152, 65535),
    dst_port: dstPort,
    protocol: protocol,
    interface: pick(random, device.interfaces),
    bytes_in: bytesIn,
    bytes_out: bytesOut,
    packets_in: Math.max(1, Math.floor(bytesIn / intBetween(random, 420, 1100))),
    packets_out: packetsOut,
    latency_ms: latencyMs,
    jitter_ms: isAnomaly ? decimalBetween(random, 8, 24) : decimalBetween(random, 0.2, 7.5),
    packet_loss_pct: isAnomaly ? decimalBetween(random, 1, 4) : decimalBetween(random, 0, 0.5),
    cpu_util_pct: isAnomaly ? decimalBetween(random, 55, 82) : decimalBetween(random, 18, 55),
    memory_util_pct: isAnomaly ? decimalBetween(random, 64, 78) : decimalBetween(random, 40, 66),
    session_state: sessionState,
    flow_action: flowAction,
    alert_label: eventLabel(dstPort, flowAction, latencyMs, device.device_type),
  };
}

function generateRows(args) {
  const random = args.seed === null || Number.isNaN(args.seed) ? Math.random : mulberry32(args.seed);
  const rows = [];
  let timestamp = new Date("2026-05-09T08:00:00Z");

  for (let index = 1; index <= args.count; index += 1) {
    rows.push(generateRow(random, index, timestamp, args.anomalyRate));
    timestamp = new Date(timestamp.getTime() + pick(random, [5, 10, 15, 30]) * 1000);
  }

  return rows;
}

function csvEscape(value) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function writeCsv(rows, outputPath) {
  const header = fieldNames.join(",");
  const body = rows.map((row) => fieldNames.map((field) => csvEscape(row[field])).join(",")).join("\n");
  fs.writeFileSync(outputPath, `${header}\n${body}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv);
  const rows = generateRows(args);
  const outputPath = path.resolve(args.output || `generated_network_telemetry.${args.format}`);

  if (args.format === "json") {
    fs.writeFileSync(outputPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  } else {
    writeCsv(rows, outputPath);
  }

  console.log(`Wrote ${rows.length} rows to ${outputPath}`);
}

main();
