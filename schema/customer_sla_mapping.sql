CREATE TABLE customer_sla_mapping (
    customer_id VARCHAR(32) PRIMARY KEY,
    customer_name VARCHAR(128) NOT NULL,
    service_name VARCHAR(128) NOT NULL,
    site VARCHAR(64) NOT NULL,
    primary_device_id VARCHAR(64) NOT NULL,
    sla_tier VARCHAR(32) NOT NULL,
    sla_target VARCHAR(16) NOT NULL,
    impact_weight VARCHAR(16) NOT NULL,
    business_owner VARCHAR(128) NOT NULL,
    escalation_group VARCHAR(64) NOT NULL,
    CONSTRAINT fk_customer_sla_primary_device
        FOREIGN KEY (primary_device_id)
        REFERENCES network_infra_inventory (device_id)
);

CREATE INDEX idx_customer_sla_site
    ON customer_sla_mapping (site);

CREATE INDEX idx_customer_sla_tier
    ON customer_sla_mapping (sla_tier);
