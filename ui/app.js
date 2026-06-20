const inventoryPath = "../data/network_infra_inventory.csv";

const elements = {
  activeFlow: document.getElementById("activeFlow"),
  anomalyCount: document.getElementById("anomalyCount"),
  deviceCount: document.getElementById("deviceCount"),
  eventCount: document.getElementById("eventCount"),
  eventList: document.getElementById("eventList"),
  eventRate: document.getElementById("eventRate"),
  inventoryTable: document.getElementById("inventoryTable"),
  linkCount: document.getElementById("linkCount"),
  map: document.getElementById("networkMap"),
  resetButton: document.getElementById("resetButton"),
  scenarioSelect: document.getElementById("scenarioSelect"),
  startButton: document.getElementById("startButton"),
  status: document.getElementById("networkStatus"),
};

const state = {
  anomalyCount: 0,
  devices: [],
  eventCount: 0,
  links: [],
  running: false,
  timer: null,
};

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(csv) {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function pick(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function intBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function decimalBetween(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(1));
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

function normalizeDevice(device) {
  return {
    ...device,
    interfaces: device.interfaces.split("|").filter(Boolean),
    monitoring_enabled: device.monitoring_enabled === "true",
  };
}

function buildLinks(devices) {
  const byId = new Map(devices.map((device) => [device.device_id, device]));
  return devices
    .filter((device) => device.uplink_device_id && byId.has(device.uplink_device_id))
    .map((device) => ({
      id: `${device.device_id}->${device.uplink_device_id}`,
      source: device.device_id,
      target: device.uplink_device_id,
    }));
}

function layoutDevices(devices) {
  const positions = {
    "core-sw-01": { x: 48, y: 45 },
    "core-sw-02": { x: 48, y: 68 },
    "fw-hq-01": { x: 24, y: 43 },
    "edge-rtr-01": { x: 24, y: 68 },
    "edge-rtr-02": { x: 76, y: 31 },
    "fw-branch-02": { x: 76, y: 68 },
    "ap-floor1-03": { x: 50, y: 20 },
    "ap-floor3-07": { x: 67, y: 48 },
  };

  return devices.map((device, index) => ({
    ...device,
    ...(positions[device.device_id] || { x: 18 + (index % 4) * 22, y: 24 + Math.floor(index / 4) * 24 }),
  }));
}

function viewBoxPoint(device) {
  return {
    x: (device.x / 100) * 1000,
    y: (device.y / 100) * 560,
  };
}

function renderMap() {
  const map = elements.map;
  map.innerHTML = "";
  map.setAttribute("viewBox", "0 0 1000 560");

  const defs = createSvgElement("defs");
  const pattern = createSvgElement("pattern", {
    id: "gridPattern",
    width: "40",
    height: "40",
    patternUnits: "userSpaceOnUse",
  });
  pattern.appendChild(createSvgElement("path", { class: "grid-line", d: "M 40 0 L 0 0 0 40" }));
  defs.appendChild(pattern);
  map.appendChild(defs);
  map.appendChild(createSvgElement("rect", { class: "map-bg", width: "1000", height: "560" }));

  const byId = new Map(state.devices.map((device) => [device.device_id, device]));
  const linkLayer = createSvgElement("g", { class: "links" });
  const nodeLayer = createSvgElement("g", { class: "nodes" });

  for (const link of state.links) {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target) continue;

    const sourcePoint = viewBoxPoint(source);
    const targetPoint = viewBoxPoint(target);
    linkLayer.appendChild(createSvgElement("line", {
      class: "link",
      "data-link-id": link.id,
      x1: sourcePoint.x,
      y1: sourcePoint.y,
      x2: targetPoint.x,
      y2: targetPoint.y,
    }));
  }

  for (const device of state.devices) {
    const point = viewBoxPoint(device);
    const group = createSvgElement("g", {
      class: `node ${device.device_type}`,
      "data-device-id": device.device_id,
      transform: `translate(${point.x} ${point.y})`,
    });
    group.appendChild(createSvgElement("circle", { class: "node-halo", r: 36 }));
    group.appendChild(createSvgElement("circle", { class: "node-core", r: 24 }));
    group.appendChild(createSvgElement("text", { class: "node-icon", y: 6 }));
    group.lastChild.textContent = device.device_type === "access_point" ? "AP" : device.device_type[0].toUpperCase();
    group.appendChild(createSvgElement("text", { class: "node-label", y: 45 }));
    group.lastChild.textContent = device.device_id;
    group.appendChild(createSvgElement("text", { class: "node-meta", y: 62 }));
    group.lastChild.textContent = device.role.replaceAll("_", " ");
    nodeLayer.appendChild(group);
  }

  map.append(linkLayer, nodeLayer);
}

function renderInventory() {
  elements.inventoryTable.innerHTML = state.devices
    .map(
      (device) => `
        <tr>
          <td>${device.device_id}</td>
          <td>${device.device_type}</td>
          <td>${device.site}</td>
          <td>${device.role}</td>
          <td>${device.vendor}</td>
          <td>${device.criticality}</td>
          <td>${device.status}</td>
        </tr>
      `,
    )
    .join("");
}

function updateMetrics() {
  elements.deviceCount.textContent = state.devices.length;
  elements.linkCount.textContent = state.links.length;
  elements.eventCount.textContent = state.eventCount;
  elements.anomalyCount.textContent = state.anomalyCount;
}

function privateIp(site) {
  const prefixes = {
    "zurich-hq": "10.10",
    "geneva-branch": "10.40",
    "basel-branch": "10.30",
  };
  const prefix = prefixes[site] || "10.250";
  return `${prefix}.${intBetween(1, 30)}.${intBetween(2, 240)}`;
}

function publicDocIp() {
  return `${pick(["192.0.2", "198.51.100", "203.0.113"])}.${intBetween(1, 240)}`;
}

function scenarioSettings(source) {
  const scenario = elements.scenarioSelect.value;
  if (scenario === "normal") return { anomalyChance: 0, forceWireless: false };
  if (scenario === "scan") return { anomalyChance: 0.65, forceWireless: false };
  if (scenario === "wireless") return { anomalyChance: source.device_type === "access_point" ? 0.75 : 0.12, forceWireless: source.device_type === "access_point" };
  return { anomalyChance: 0.22, forceWireless: false };
}

function generateEvent() {
  const source = pick(state.devices);
  const localLinks = state.links.filter((item) => item.source === source.device_id || item.target === source.device_id);
  const link = pick(localLinks.length ? localLinks : state.links);
  const targetId = link && link.source === source.device_id ? link.target : link?.source;
  const target = state.devices.find((device) => device.device_id === targetId) || pick(state.devices);
  const settings = scenarioSettings(source);
  const isAnomaly = Math.random() < settings.anomalyChance;
  const riskyPorts = [22, 23, 445, 3389, 8080];
  const normalPorts = [53, 80, 123, 443, 5432, 6379];
  const dstPort = pick(isAnomaly ? riskyPorts : normalPorts);
  const denied = isAnomaly && source.device_type === "firewall";
  const latency = isAnomaly || settings.forceWireless ? decimalBetween(65, 120) : decimalBetween(3, 38);
  const alertLabel = denied
    ? "blocked_connection"
    : settings.forceWireless
      ? "high_wireless_load"
      : isAnomaly
        ? "high_latency"
        : "normal";

  return {
    alertLabel,
    dstIp: privateIp(target.site),
    dstPort,
    flowAction: denied ? "deny" : "allow",
    id: `evt-${String(state.eventCount + 1).padStart(6, "0")}`,
    latency,
    protocol: Math.random() < 0.75 ? "TCP" : "UDP",
    source,
    srcIp: denied ? publicDocIp() : privateIp(source.site),
    target,
  };
}

function clearActivity() {
  document.querySelectorAll(".node.active").forEach((node) => node.classList.remove("active"));
  document.querySelectorAll(".link.active").forEach((link) => link.classList.remove("active"));
}

function animateEvent(event) {
  clearActivity();

  const sourceNode = document.querySelector(`[data-device-id="${event.source.device_id}"]`);
  const targetNode = document.querySelector(`[data-device-id="${event.target.device_id}"]`);
  const link = state.links.find(
    (item) =>
      (item.source === event.source.device_id && item.target === event.target.device_id) ||
      (item.target === event.source.device_id && item.source === event.target.device_id),
  );
  const linkElement = link ? document.querySelector(`[data-link-id="${link.id}"]`) : null;

  sourceNode?.classList.add("active");
  targetNode?.classList.add("active");
  linkElement?.classList.add("active");

  const sourcePoint = viewBoxPoint(event.source);
  const targetPoint = viewBoxPoint(event.target);
  const packet = createSvgElement("circle", { class: `packet ${event.flowAction === "deny" ? "denied" : ""}`, r: 7 });
  const motion = createSvgElement("animateMotion", {
    dur: "900ms",
    fill: "freeze",
    path: `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`,
  });
  packet.appendChild(motion);
  elements.map.appendChild(packet);
  motion.beginElement();

  const pulse = createSvgElement("circle", { class: "pulse running", cx: targetPoint.x, cy: targetPoint.y, r: 4 });
  elements.map.appendChild(pulse);
  window.setTimeout(() => {
    packet.remove();
    pulse.remove();
  }, 1000);
}

function renderEvent(event) {
  const card = document.createElement("article");
  card.className = `event ${event.alertLabel === "normal" ? "" : "anomaly"} ${event.flowAction === "deny" ? "denied" : ""}`;
  card.innerHTML = `
    <div class="event-title">
      <span>${event.source.device_id} -> ${event.target.device_id}</span>
      <span>${event.flowAction.toUpperCase()}</span>
    </div>
    <div class="event-detail">
      ${event.protocol}/${event.dstPort} | ${event.srcIp} -> ${event.dstIp}<br>
      ${event.latency} ms | ${event.alertLabel}
    </div>
  `;
  elements.eventList.prepend(card);

  while (elements.eventList.children.length > 16) {
    elements.eventList.lastElementChild.remove();
  }
}

function tick() {
  const event = generateEvent();
  state.eventCount += 1;
  if (event.alertLabel !== "normal") {
    state.anomalyCount += 1;
  }
  elements.activeFlow.textContent = `${event.source.device_id} to ${event.target.device_id}`;
  animateEvent(event);
  renderEvent(event);
  updateMetrics();
}

function startNetwork() {
  if (!state.devices.length) {
    elements.status.textContent = "Inventory is not loaded yet. Start the app with node server.js and refresh the page.";
    return;
  }
  if (state.running) return;
  state.running = true;
  document.body.classList.add("network-running");
  elements.startButton.setAttribute("aria-pressed", "true");
  elements.startButton.textContent = "Stop";
  elements.status.textContent = "Network is running. Telemetry is streaming.";
  elements.eventRate.textContent = "Live";
  tick();
  state.timer = window.setInterval(tick, 900);
}

function stopNetwork() {
  state.running = false;
  window.clearInterval(state.timer);
  document.body.classList.remove("network-running");
  elements.startButton.setAttribute("aria-pressed", "false");
  elements.startButton.textContent = "Start";
  elements.status.textContent = "Network is stopped. Last telemetry remains visible.";
  elements.eventRate.textContent = "Paused";
  clearActivity();
}

function resetNetwork() {
  stopNetwork();
  state.eventCount = 0;
  state.anomalyCount = 0;
  elements.eventList.innerHTML = "";
  elements.activeFlow.textContent = "No active flow";
  elements.status.textContent = state.devices.length ? "Inventory loaded. Network is stopped." : "Loading inventory...";
  elements.eventRate.textContent = "Idle";
  updateMetrics();
}

function bindControls() {
  elements.startButton.addEventListener("click", () => {
    if (state.running) {
      stopNetwork();
    } else {
      startNetwork();
    }
  });
  elements.resetButton.addEventListener("click", resetNetwork);
}

async function init() {
  bindControls();
  const response = await fetch(inventoryPath);
  if (!response.ok) {
    throw new Error("Could not load network inventory.");
  }
  const csv = await response.text();
  state.devices = layoutDevices(parseCsv(csv).map(normalizeDevice).filter((device) => device.status === "active" && device.monitoring_enabled));
  state.links = buildLinks(state.devices);

  renderMap();
  renderInventory();
  updateMetrics();
  elements.status.textContent = "Inventory loaded. Network is stopped.";
}

init().catch((error) => {
  elements.status.textContent = error.message;
});
