CREATE TABLE network_infra_inventory (
    device_id VARCHAR(64) PRIMARY KEY,
    hostname VARCHAR(128) NOT NULL,
    device_type VARCHAR(32) NOT NULL,
    site VARCHAR(64) NOT NULL,
    region VARCHAR(32) NOT NULL,
    role VARCHAR(64) NOT NULL,
    vendor VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    os_version VARCHAR(64) NOT NULL,
    management_ip VARCHAR(45) NOT NULL,
    serial_number VARCHAR(64) NOT NULL,
    environment VARCHAR(32) NOT NULL,
    criticality VARCHAR(16) NOT NULL,
    owner_team VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    install_date DATE NOT NULL,
    interfaces VARCHAR(512) NOT NULL,
    uplink_device_id VARCHAR(64),
    monitoring_enabled BOOLEAN NOT NULL
);

CREATE TABLE network_telemetry_base (
    event_id VARCHAR(32) PRIMARY KEY,
    timestamp_utc TIMESTAMP NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_type VARCHAR(32) NOT NULL,
    site VARCHAR(64) NOT NULL,
    src_ip VARCHAR(45) NOT NULL,
    dst_ip VARCHAR(45) NOT NULL,
    src_port INTEGER NOT NULL,
    dst_port INTEGER NOT NULL,
    protocol VARCHAR(8) NOT NULL,
    interface VARCHAR(32) NOT NULL,
    bytes_in BIGINT NOT NULL,
    bytes_out BIGINT NOT NULL,
    packets_in BIGINT NOT NULL,
    packets_out BIGINT NOT NULL,
    latency_ms DECIMAL(8, 2) NOT NULL,
    jitter_ms DECIMAL(8, 2) NOT NULL,
    packet_loss_pct DECIMAL(5, 2) NOT NULL,
    cpu_util_pct DECIMAL(5, 2) NOT NULL,
    memory_util_pct DECIMAL(5, 2) NOT NULL,
    session_state VARCHAR(32) NOT NULL,
    flow_action VARCHAR(16) NOT NULL,
    alert_label VARCHAR(64) NOT NULL,
    CONSTRAINT fk_network_telemetry_device
        FOREIGN KEY (device_id)
        REFERENCES network_infra_inventory (device_id)
);

CREATE INDEX idx_network_infra_site
    ON network_infra_inventory (site);

CREATE INDEX idx_network_infra_type
    ON network_infra_inventory (device_type);

CREATE INDEX idx_network_infra_criticality
    ON network_infra_inventory (criticality);

CREATE INDEX idx_network_telemetry_time
    ON network_telemetry_base (timestamp_utc);

CREATE INDEX idx_network_telemetry_device
    ON network_telemetry_base (device_id);

CREATE INDEX idx_network_telemetry_alert
    ON network_telemetry_base (alert_label);
