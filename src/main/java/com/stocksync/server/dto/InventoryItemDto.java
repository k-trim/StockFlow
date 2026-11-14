package com.stocksync.server.dto;

import java.time.Instant;

/**
 * API DTO for inventory items.
 */
public class InventoryItemDto {
    private Long id;
    private String sku;
    private String name;
    private int quantity;
    private Instant updatedAt;
    private Long version;

    public InventoryItemDto() {
    }

    public InventoryItemDto(
            Long id,
            String sku,
            String name,
            int quantity,
            Instant updatedAt,
            Long version) {
        this.id = id;
        this.sku = sku;
        this.name = name;
        this.quantity = quantity;
        this.updatedAt = updatedAt;
        this.version = version;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
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
}
