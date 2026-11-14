package com.stocksync.server.controller;

import com.stocksync.server.dto.BuyRequestDto;
import com.stocksync.server.dto.InventoryItemDto;
import com.stocksync.server.dto.InventoryMutationRequestDto;
import com.stocksync.server.service.InventoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST API for inventory management.
 */
@RestController
@RequestMapping("/api/inventory")
@Tag(name = "Inventory")
public class InventoryController {
    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/items")
    public List<InventoryItemDto> listItems() {
        return inventoryService.getAllItems();
    }

    @GetMapping("/items/{sku}")
    public InventoryItemDto getItem(@PathVariable String sku) {
        return inventoryService.getBySku(sku);
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryItemDto createItem(@RequestBody InventoryMutationRequestDto request) {
        return inventoryService.createItem(request);
    }

    @PutMapping("/items/{sku}")
    public InventoryItemDto updateItem(
            @PathVariable String sku,
            @RequestBody InventoryMutationRequestDto request) {
        return inventoryService.updateItem(sku, request);
    }

    @PostMapping("/items/{sku}/buy")
    public InventoryItemDto buyItem(
            @PathVariable String sku,
            @RequestBody BuyRequestDto request) {
        return inventoryService.buyItem(sku, request);
    }
}
