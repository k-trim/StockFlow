package com.stocksync.server.dto;

import java.time.Instant;

/**
 * STOMP payload sent by peer nodes for synchronization.
 */
public class InventorySyncMessageDto {
    private String sku;
    private String name;
    private Integer quantity;
    private Instant updatedAt;
    private Long version;
    private String sourceNodeIp;

    public InventorySyncMessageDto() {
    }

    public InventorySyncMessageDto(
            String sku,
            String name,
            Integer quantity,
            Instant updatedAt,
            Long version,
            String sourceNodeIp) {
        this.sku = sku;
        this.name = name;
        this.quantity = quantity;
        this.updatedAt = updatedAt;
        this.version = version;
        this.sourceNodeIp = sourceNodeIp;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public String getSourceNodeIp() {
        return sourceNodeIp;
    }

    public void setSourceNodeIp(String sourceNodeIp) {
        this.sourceNodeIp = sourceNodeIp;
    }
}
