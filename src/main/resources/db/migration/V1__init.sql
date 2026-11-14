CREATE TABLE inventory_items (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inventory_items_updated_at ON inventory_items(updated_at);

CREATE TABLE peer_nodes (
    id BIGSERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    last_seen TIMESTAMPTZ
);

CREATE INDEX idx_peer_nodes_last_seen ON peer_nodes(last_seen);
