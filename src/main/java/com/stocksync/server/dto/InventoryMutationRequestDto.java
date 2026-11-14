package com.stocksync.server.dto;

/**
 * REST request payload for creating or updating inventory items.
 */
public class InventoryMutationRequestDto {
    private String sku;
    private String name;
    private Integer quantity;

    public InventoryMutationRequestDto() {
    }

    public InventoryMutationRequestDto(String sku, String name, Integer quantity) {
        this.sku = sku;
        this.name = name;
        this.quantity = quantity;
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
}
