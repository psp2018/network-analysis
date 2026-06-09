param(
    [int]$Count = 100,
    [double]$AnomalyRate = 0.15,
    [ValidateSet("csv", "json")]
    [string]$Format = "csv",
    [string]$Output = "data/generated_network_telemetry.csv",
    [int]$Seed = 0
)

if ($Count -lt 1) {
    throw "Count must be at least 1."
}

if ($AnomalyRate -lt 0 -or $AnomalyRate -gt 1) {
    throw "AnomalyRate must be between 0.0 and 1.0."
}

if ($Seed -ne 0) {
    $random = [System.Random]::new($Seed)
} else {
    $random = [System.Random]::new()
}

$devices = @(
    @{ device_id = "edge-rtr-01"; device_type = "router"; site = "zurich-hq"; interfaces = @("ge-0/0/1", "ge-0/0/2") },
    @{ device_id = "edge-rtr-02"; device_type = "router"; site = "geneva-branch"; interfaces = @("ge-0/0/0", "ge-0/0/1") },
    @{ device_id = "core-sw-01"; device_type = "switch"; site = "zurich-hq"; interfaces = @("xe-0/1/0", "xe-0/1/2", "xe-0/1/3") },
    @{ device_id = "core-sw-02"; device_type = "switch"; site = "zurich-hq"; interfaces = @("xe-0/1/1", "xe-0/1/2") },
    @{ device_id = "fw-hq-01"; device_type = "firewall"; site = "zurich-hq"; interfaces = @("wan0", "lan0") },
    @{ device_id = "fw-branch-02"; device_type = "firewall"; site = "basel-branch"; interfaces = @("wan1", "lan1") },
    @{ device_id = "ap-floor1-03"; device_type = "access_point"; site = "zurich-hq"; interfaces = @("wlan0") },
    @{ device_id = "ap-floor3-07"; device_type = "access_point"; site = "zurich-hq"; interfaces = @("wlan0") }
)

$normalPorts = @(53, 80, 123, 443, 5432, 6379)
$riskyPorts = @(22, 23, 445, 3389, 8080)

function Pick($Items) {
    return $Items[$random.Next(0, $Items.Count)]
}

function DecimalBetween([double]$Min, [double]$Max) {
    return [math]::Round(($random.NextDouble() * ($Max - $Min)) + $Min, 1)
}

function PrivateIp([string]$Site) {
    $prefixes = @{
        "zurich-hq" = "10.10"
        "geneva-branch" = "10.40"
        "basel-branch" = "10.30"
    }
    return "$($prefixes[$Site]).$($random.Next(1, 31)).$($random.Next(2, 241))"
}

function PublicDocIp {
    $network = Pick @("192.0.2", "198.51.100", "203.0.113")
    return "$network.$($random.Next(1, 241))"
}

function Get-AlertLabel([int]$DstPort, [string]$FlowAction, [double]$LatencyMs, [string]$DeviceType) {
    if ($FlowAction -eq "deny") {
        switch ($DstPort) {
            22 { return "suspicious_ssh" }
            23 { return "blocked_telnet" }
            445 { return "blocked_smb" }
            3389 { return "blocked_rdp" }
            8080 { return "blocked_scan" }
            default { return "blocked_connection" }
        }
    }
    if ($LatencyMs -ge 65) {
        return "high_latency"
    }
    if ($DeviceType -eq "access_point" -and $LatencyMs -ge 24) {
        return "high_wireless_load"
    }
    return "normal"
}

$timestamp = [datetime]::Parse("2026-05-09T08:00:00Z").ToUniversalTime()
$rows = @()

for ($index = 1; $index -le $Count; $index++) {
    $device = Pick $devices
    $isAnomaly = $random.NextDouble() -lt $AnomalyRate
    $dstPort = if ($isAnomaly) { Pick $riskyPorts } else { Pick $normalPorts }
    $protocol = if ($random.NextDouble() -lt 0.75) { "TCP" } else { "UDP" }
    $flowAction = if ($isAnomaly -and $device.device_type -eq "firewall") { "deny" } else { "allow" }

    if ($flowAction -eq "deny") {
        $srcIp = PublicDocIp
        $dstIp = PrivateIp $device.site
        $bytesOut = 0
        $packetsOut = 0
        $sessionState = "syn_sent"
    } else {
        $srcIp = PrivateIp $device.site
        $dstIp = if ($random.NextDouble() -lt 0.65) { PrivateIp "zurich-hq" } else { PublicDocIp }
        $bytesOut = $random.Next(400, 600001)
        $packetsOut = [math]::Max(1, [math]::Floor($bytesOut / $random.Next(420, 1101)))
        $sessionState = Pick @("established", "closed", "fin_wait")
    }

    $latencyMs = if ($isAnomaly) { DecimalBetween 60 115 } else { DecimalBetween 2 40 }
    $bytesIn = $random.Next(300, 250001)

    $rows += [pscustomobject]@{
        event_id = "evt-{0:D6}" -f $index
        timestamp_utc = $timestamp.ToString("yyyy-MM-ddTHH:mm:ssZ")
        device_id = $device.device_id
        device_type = $device.device_type
        site = $device.site
        src_ip = $srcIp
        dst_ip = $dstIp
        src_port = $random.Next(49152, 65536)
        dst_port = $dstPort
        protocol = $protocol
        interface = Pick $device.interfaces
        bytes_in = $bytesIn
        bytes_out = $bytesOut
        packets_in = [math]::Max(1, [math]::Floor($bytesIn / $random.Next(420, 1101)))
        packets_out = $packetsOut
        latency_ms = $latencyMs
        jitter_ms = if ($isAnomaly) { DecimalBetween 8 24 } else { DecimalBetween 0.2 7.5 }
        packet_loss_pct = if ($isAnomaly) { DecimalBetween 1 4 } else { DecimalBetween 0 0.5 }
        cpu_util_pct = if ($isAnomaly) { DecimalBetween 55 82 } else { DecimalBetween 18 55 }
        memory_util_pct = if ($isAnomaly) { DecimalBetween 64 78 } else { DecimalBetween 40 66 }
        session_state = $sessionState
        flow_action = $flowAction
        alert_label = Get-AlertLabel $dstPort $flowAction $latencyMs $device.device_type
    }

    $timestamp = $timestamp.AddSeconds((Pick @(5, 10, 15, 30)))
}

$outputPath = Resolve-Path -Path "." | ForEach-Object { Join-Path $_ $Output }
$outputDir = Split-Path $outputPath -Parent
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

if ($Format -eq "json") {
    $rows | ConvertTo-Json -Depth 3 | Set-Content -Path $outputPath -Encoding UTF8
} else {
    $rows | Export-Csv -Path $outputPath -NoTypeInformation -Encoding UTF8
}

Write-Host "Wrote $($rows.Count) rows to $outputPath"
