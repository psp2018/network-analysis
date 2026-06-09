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

CREATE INDEX idx_network_infra_site
    ON network_infra_inventory (site);

CREATE INDEX idx_network_infra_type
    ON network_infra_inventory (device_type);

CREATE INDEX idx_network_infra_criticality
    ON network_infra_inventory (criticality);
