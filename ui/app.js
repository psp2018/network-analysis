const inventoryPath = "/data/network_infra_inventory.csv";
const customerSlaPath = "/data/customer_sla_mapping.csv";
const storageKey = "network-analysis-live-events";

const elements = {
  activeFlow: document.getElementById("activeFlow"),
  anomalyCount: document.getElementById("anomalyCount"),
  anomaliesTab: document.getElementById("anomaliesTab"),
  anomaliesTabCount: document.getElementById("anomaliesTabCount"),
  careTab: document.getElementById("careTab"),
  careTabCount: document.getElementById("careTabCount"),
  deviceCount: document.getElementById("deviceCount"),
  eventCount: document.getElementById("eventCount"),
  exportButton: document.getElementById("exportButton"),
  eventList: document.getElementById("eventList"),
  eventRate: document.getElementById("eventRate"),
  eventsTab: document.getElementById("eventsTab"),
  eventsTabCount: document.getElementById("eventsTabCount"),
  inventoryTable: document.getElementById("inventoryTable"),
  linkCount: document.getElementById("linkCount"),
  map: document.getElementById("networkMap"),
  platinumRiskCount: document.getElementById("platinumRiskCount"),
  resetButton: document.getElementById("resetButton"),
  scenarioSelect: document.getElementById("scenarioSelect"),
  startButton: document.getElementById("startButton"),
  status: document.getElementById("networkStatus"),
  ticketRiskCount: document.getElementById("ticketRiskCount"),
};

const state = {
  anomalyCount: 0,
  activeTab: "events",
  customerServices: [],
  devices: [],
  events: [],
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
  const careItems = careDeskItems();
  elements.deviceCount.textContent = state.devices.length;
  elements.linkCount.textContent = state.links.length;
  elements.eventCount.textContent = state.eventCount;
  elements.anomalyCount.textContent = state.anomalyCount;
  elements.eventsTabCount.textContent = state.events.length;
  elements.anomaliesTabCount.textContent = state.events.filter(isAnomalyEvent).length;
  elements.careTabCount.textContent = careItems.length;
  elements.platinumRiskCount.textContent = careItems.filter((item) => item.slaTier === "Platinum").length;
  elements.ticketRiskCount.textContent = careItems.length;
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

function eventToRecord(event) {
  return {
    id: event.id,
    timestamp: event.timestamp,
    source_device_id: event.source.device_id,
    source_site: event.source.site,
    target_device_id: event.target.device_id,
    target_site: event.target.site,
    src_ip: event.srcIp,
    dst_ip: event.dstIp,
    dst_port: event.dstPort,
    protocol: event.protocol,
    latency_ms: event.latency,
    flow_action: event.flowAction,
    alert_label: event.alertLabel,
    customer_name: event.businessImpact?.customerName || "",
    service_name: event.businessImpact?.serviceName || "",
    sla_tier: event.businessImpact?.slaTier || "",
    sla_target: event.businessImpact?.slaTarget || "",
    impact_level: event.businessImpact?.impactLevel || "",
    impact_weight: event.businessImpact?.impactWeight || "",
    impact_summary: event.businessImpact?.impactSummary || "",
    business_owner: event.businessImpact?.businessOwner || "",
    escalation_group: event.businessImpact?.escalationGroup || "",
  };
}

function recordToEvent(record) {
  const source = state.devices.find((device) => device.device_id === record.source_device_id) || {
    device_id: record.source_device_id,
    site: record.source_site,
    device_type: "unknown",
  };
  const target = state.devices.find((device) => device.device_id === record.target_device_id) || {
    device_id: record.target_device_id,
    site: record.target_site,
    device_type: "unknown",
  };

  return {
    alertLabel: record.alert_label,
    businessImpact: {
      businessOwner: record.business_owner || "Unknown",
      customerName: record.customer_name || "Unknown customer",
      escalationGroup: record.escalation_group || "service-desk",
      impactLevel: record.impact_level || "Low",
      impactSummary: record.impact_summary || "No business impact summary saved.",
      impactWeight: record.impact_weight || "low",
      serviceName: record.service_name || "Unknown service",
      slaTarget: record.sla_target || "Unknown",
      slaTier: record.sla_tier || "Unassigned",
    },
    dstIp: record.dst_ip,
    dstPort: Number(record.dst_port),
    flowAction: record.flow_action,
    id: record.id,
    latency: Number(record.latency_ms),
    protocol: record.protocol,
    source,
    srcIp: record.src_ip,
    target,
    timestamp: record.timestamp,
  };
}

function saveEvents() {
  const records = state.events.map(eventToRecord);
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function loadSavedEvents() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const records = JSON.parse(raw);
    state.events = records.map(recordToEvent);
    state.eventCount = state.events.length;
    state.anomalyCount = state.events.filter(isAnomalyEvent).length;
    if (state.events[0]) {
      elements.activeFlow.textContent = `${state.events[0].source.device_id} to ${state.events[0].target.device_id}`;
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function clearSavedEvents() {
  localStorage.removeItem(storageKey);
}

function scenarioSettings(source) {
  const scenario = elements.scenarioSelect.value;
  if (scenario === "normal") return { anomalyChance: 0, forceWireless: false };
  if (scenario === "scan") return { anomalyChance: 0.65, forceWireless: false };
  if (scenario === "wireless") return { anomalyChance: source.device_type === "access_point" ? 0.75 : 0.12, forceWireless: source.device_type === "access_point" };
  return { anomalyChance: 0.22, forceWireless: false };
}

function impactLevelFor(service, event) {
  if (event.flowAction === "deny" && service.sla_tier === "Platinum") return "Severe";
  if (event.flowAction === "deny") return "High";
  if (event.latency >= 100 && ["Platinum", "Gold"].includes(service.sla_tier)) return "High";
  if (event.latency >= 65) return "Medium";
  return "Low";
}

function findImpactedService(event) {
  const directMatch = state.customerServices.find((service) =>
    service.primary_device_id === event.source.device_id || service.primary_device_id === event.target.device_id,
  );
  if (directMatch) return directMatch;

  return state.customerServices.find((service) =>
    service.site === event.source.site || service.site === event.target.site,
  ) || {
    business_owner: "Network Operations",
    customer_name: "Internal Operations",
    escalation_group: "network-operations",
    impact_weight: "low",
    service_name: "Shared Network",
    sla_target: "Best effort",
    sla_tier: "Internal",
  };
}

function businessImpactFor(event) {
  const service = findImpactedService(event);
  const impactLevel = impactLevelFor(service, event);
  const cause = event.flowAction === "deny"
    ? "blocked traffic"
    : event.alertLabel === "high_wireless_load"
      ? "wireless congestion"
      : event.alertLabel === "high_latency"
        ? "high latency"
        : "network degradation";

  return {
    businessOwner: service.business_owner,
    customerName: service.customer_name,
    escalationGroup: service.escalation_group,
    impactLevel,
    impactSummary: `${service.service_name} may be affected by ${cause} at ${event.target.site}.`,
    impactWeight: service.impact_weight,
    serviceName: service.service_name,
    slaTarget: service.sla_target,
    slaTier: service.sla_tier,
  };
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

  const event = {
    alertLabel,
    businessImpact: null,
    dstIp: privateIp(target.site),
    dstPort,
    flowAction: denied ? "deny" : "allow",
    id: `evt-${String(state.eventCount + 1).padStart(6, "0")}`,
    latency,
    protocol: Math.random() < 0.75 ? "TCP" : "UDP",
    source,
    srcIp: denied ? publicDocIp() : privateIp(source.site),
    target,
    timestamp: new Date().toISOString(),
  };
  event.businessImpact = businessImpactFor(event);
  return event;
}

function isAnomalyEvent(event) {
  return event.alertLabel !== "normal" || event.flowAction === "deny";
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

function eventCardHtml(event) {
  const impact = event.businessImpact;
  const impactHtml = isAnomalyEvent(event) && impact
    ? `
      <div class="business-impact ${impact.impactLevel.toLowerCase()}">
        <div class="impact-header">
          <span>${impact.customerName}</span>
          <strong>${impact.slaTier} SLA</strong>
        </div>
        <div>${impact.serviceName} | ${impact.impactLevel} impact | Target ${impact.slaTarget}</div>
        <div>${impact.impactSummary}</div>
        <div>Owner: ${impact.businessOwner} | Escalate: ${impact.escalationGroup}</div>
      </div>
    `
    : "";

  return `
    <article class="event ${event.alertLabel === "normal" ? "" : "anomaly"} ${event.flowAction === "deny" ? "denied" : ""}">
      <div class="event-title">
        <span>${event.source.device_id} -> ${event.target.device_id}</span>
        <span>${event.flowAction.toUpperCase()}</span>
      </div>
      <div class="event-detail">
        ${new Date(event.timestamp).toLocaleTimeString()}<br>
        ${event.protocol}/${event.dstPort} | ${event.srcIp} -> ${event.dstIp}<br>
        ${event.latency} ms | ${event.alertLabel}
      </div>
      ${impactHtml}
    </article>
  `;
}

function severityRank(level) {
  return {
    Low: 1,
    Medium: 2,
    High: 3,
    Severe: 4,
  }[level] || 0;
}

function careDeskItems() {
  const grouped = new Map();
  for (const event of state.events.filter(isAnomalyEvent)) {
    const impact = event.businessImpact;
    if (!impact) continue;

    const key = `${impact.customerName}|${impact.serviceName}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        businessOwner: impact.businessOwner,
        customerName: impact.customerName,
        escalationGroup: impact.escalationGroup,
        eventCount: 1,
        impactLevel: impact.impactLevel,
        latestEvent: event,
        serviceName: impact.serviceName,
        slaTarget: impact.slaTarget,
        slaTier: impact.slaTier,
      });
      continue;
    }

    existing.eventCount += 1;
    if (severityRank(impact.impactLevel) > severityRank(existing.impactLevel)) {
      existing.impactLevel = impact.impactLevel;
      existing.latestEvent = event;
    }
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const slaDelta = Number(right.slaTier === "Platinum") - Number(left.slaTier === "Platinum");
    if (slaDelta) return slaDelta;
    const severityDelta = severityRank(right.impactLevel) - severityRank(left.impactLevel);
    if (severityDelta) return severityDelta;
    return right.eventCount - left.eventCount;
  });
}

function careCardHtml(item) {
  const isPlatinum = item.slaTier === "Platinum";
  const likelyTicket = isPlatinum || ["High", "Severe"].includes(item.impactLevel);
  return `
    <article class="care-card ${item.impactLevel.toLowerCase()} ${isPlatinum ? "platinum" : ""}">
      <div class="care-title">
        <span>${item.customerName}</span>
        <strong>${likelyTicket ? "Likely ticket" : "Watch"}</strong>
      </div>
      <div class="care-service">${item.serviceName}</div>
      <div class="care-grid">
        <span>SLA</span><strong>${item.slaTier} / ${item.slaTarget}</strong>
        <span>Impact</span><strong>${item.impactLevel}</strong>
        <span>Events</span><strong>${item.eventCount}</strong>
        <span>Escalate</span><strong>${item.escalationGroup}</strong>
      </div>
      <div class="care-summary">
        ${item.latestEvent.alertLabel} on ${item.latestEvent.target.site}. Owner: ${item.businessOwner}.
      </div>
    </article>
  `;
}

function renderCareDesk() {
  const items = careDeskItems();
  elements.eventList.innerHTML = items.length
    ? items.map(careCardHtml).join("")
    : `<div class="empty-state">No customer-impact risks yet. Port scan is the fastest way to test this view.</div>`;
}

function renderEvents() {
  if (state.activeTab === "care") {
    renderCareDesk();
    return;
  }
  const visibleEvents = state.activeTab === "anomalies" ? state.events.filter(isAnomalyEvent) : state.events;
  const emptyText = state.activeTab === "anomalies"
    ? "No anomalies yet. Try Port scan or Wireless load."
    : "No events yet. Click Start to stream telemetry.";

  elements.eventList.innerHTML = visibleEvents.length
    ? visibleEvents.slice(0, 16).map(eventCardHtml).join("")
    : `<div class="empty-state">${emptyText}</div>`;
}

function addEvent(event) {
  state.events.unshift(event);
  if (state.events.length > 200) {
    state.events.length = 200;
  }
  saveEvents();
  renderEvents();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function exportCsv() {
  if (!state.events.length) {
    window.alert("No events to export yet. Click Start to generate telemetry first.");
    return;
  }

  const records = state.events.map(eventToRecord);
  const headers = Object.keys(records[0]);
  const csv = [
    headers.join(","),
    ...records.map((record) => headers.map((header) => csvEscape(record[header])).join(",")),
  ].join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
  link.href = url;
  link.download = `network-telemetry-session-${timestamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  const isEvents = tabName === "events";
  const isAnomalies = tabName === "anomalies";
  const isCare = tabName === "care";
  elements.eventsTab.classList.toggle("active", isEvents);
  elements.anomaliesTab.classList.toggle("active", isAnomalies);
  elements.careTab.classList.toggle("active", isCare);
  elements.eventsTab.setAttribute("aria-selected", String(isEvents));
  elements.anomaliesTab.setAttribute("aria-selected", String(isAnomalies));
  elements.careTab.setAttribute("aria-selected", String(isCare));
  renderEvents();
}

function tick() {
  const event = generateEvent();
  state.eventCount += 1;
  if (event.alertLabel !== "normal") {
    state.anomalyCount += 1;
  }
  elements.activeFlow.textContent = `${event.source.device_id} to ${event.target.device_id}`;
  animateEvent(event);
  addEvent(event);
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
  const hasData = state.eventCount > 0 || state.anomalyCount > 0 || state.events.length > 0;
  if (hasData && !window.confirm("Clear all events and anomalies? This resets the live telemetry view and counters.")) {
    return;
  }
  stopNetwork();
  state.eventCount = 0;
  state.anomalyCount = 0;
  state.events = [];
  clearSavedEvents();
  elements.activeFlow.textContent = "No active flow";
  elements.status.textContent = state.devices.length ? "Inventory loaded. Network is stopped." : "Loading inventory...";
  elements.eventRate.textContent = "Idle";
  updateMetrics();
  renderEvents();
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
  elements.exportButton.addEventListener("click", exportCsv);
  elements.eventsTab.addEventListener("click", () => setActiveTab("events"));
  elements.anomaliesTab.addEventListener("click", () => setActiveTab("anomalies"));
  elements.careTab.addEventListener("click", () => setActiveTab("care"));
}

async function init() {
  bindControls();
  const [response, customerResponse] = await Promise.all([
    fetch(inventoryPath),
    fetch(customerSlaPath),
  ]);
  if (!response.ok) {
    throw new Error("Could not load network inventory.");
  }
  if (!customerResponse.ok) {
    throw new Error("Could not load customer SLA mapping.");
  }
  const csv = await response.text();
  const customerCsv = await customerResponse.text();
  state.devices = layoutDevices(parseCsv(csv).map(normalizeDevice).filter((device) => device.status === "active" && device.monitoring_enabled));
  state.customerServices = parseCsv(customerCsv);
  state.links = buildLinks(state.devices);
  loadSavedEvents();

  renderMap();
  renderInventory();
  updateMetrics();
  renderEvents();
  elements.status.textContent = "Inventory and customer SLA mapping loaded. Network is stopped.";
}

init().catch((error) => {
  elements.status.textContent = error.message;
});
