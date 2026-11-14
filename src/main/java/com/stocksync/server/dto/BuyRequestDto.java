package com.stocksync.server.dto;

public class BuyRequestDto {
    private Integer quantity;

    public BuyRequestDto() {}

    public BuyRequestDto(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
