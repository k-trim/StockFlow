package com.stocksync.server.service;

import com.stocksync.server.dto.BuyRequestDto;
import com.stocksync.server.dto.InventoryItemDto;
import com.stocksync.server.dto.InventoryMutationRequestDto;
import com.stocksync.server.entity.InventoryItem;
import com.stocksync.server.exception.BadRequestException;
import com.stocksync.server.exception.ConflictException;
import com.stocksync.server.exception.ResourceNotFoundException;
import com.stocksync.server.repository.InventoryItemRepository;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Business logic for REST-driven inventory operations.
 */
@Service
public class InventoryService {
    private final InventoryItemRepository repository;
    private final InventorySyncService syncService;

    public InventoryService(InventoryItemRepository repository, InventorySyncService syncService) {
        this.repository = repository;
        this.syncService = syncService;
    }

    @Transactional(readOnly = true)
    public List<InventoryItemDto> getAllItems() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryItemDto getBySku(String sku) {
        if (!StringUtils.hasText(sku)) {
            throw new BadRequestException("sku is required");
        }

        InventoryItem item = repository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found for sku: " + sku));

        return toDto(item);
    }

    @Transactional
    public InventoryItemDto createItem(InventoryMutationRequestDto request) {
        validateCreate(request);

        String sku = request.getSku().trim();
        if (repository.findBySku(sku).isPresent()) {
            throw new ConflictException("Item already exists for sku: " + sku);
        }

        InventoryItem item = new InventoryItem();
        item.setSku(sku);
        item.setName(request.getName().trim());
        item.setQuantity(request.getQuantity());
        item.setUpdatedAt(Instant.now());

        InventoryItem saved = repository.save(item);
        InventoryItemDto payload = toDto(saved);
        syncService.broadcastInventoryMutation(payload);
        return payload;
    }

    @Transactional
    public InventoryItemDto updateItem(String sku, InventoryMutationRequestDto request) {
        if (!StringUtils.hasText(sku)) {
            throw new BadRequestException("sku is required");
        }
        validateUpdate(request);

        InventoryItem item = repository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found for sku: " + sku));

        if (StringUtils.hasText(request.getName())) {
            item.setName(request.getName().trim());
        }
        if (request.getQuantity() != null) {
            if (request.getQuantity() < 0) {
                throw new BadRequestException("quantity must be zero or greater");
            }
            item.setQuantity(request.getQuantity());
        }
        item.setUpdatedAt(Instant.now());

        InventoryItem saved = repository.save(item);
        InventoryItemDto payload = toDto(saved);
        syncService.broadcastInventoryMutation(payload);
        return payload;
    }

    @Transactional
    public InventoryItemDto buyItem(String sku, BuyRequestDto request) {
        if (!StringUtils.hasText(sku)) {
            throw new BadRequestException("sku is required");
        }
        if (request == null || request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException("valid quantity is required");
        }

        InventoryItem item = repository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found for sku: " + sku));

        if (item.getQuantity() < request.getQuantity()) {
            throw new BadRequestException("not enough stock available");
        }

        item.setQuantity(item.getQuantity() - request.getQuantity());
        item.setUpdatedAt(Instant.now());

        InventoryItem saved = repository.save(item);
        InventoryItemDto payload = toDto(saved);
        syncService.broadcastInventoryMutation(payload);
        return payload;
    }

    private void validateCreate(InventoryMutationRequestDto request) {
        if (request == null) {
            throw new BadRequestException("request body is required");
        }
        if (!StringUtils.hasText(request.getSku())) {
            throw new BadRequestException("sku is required");
        }
        if (!StringUtils.hasText(request.getName())) {
            throw new BadRequestException("name is required");
        }
        if (request.getQuantity() == null) {
            throw new BadRequestException("quantity is required");
        }
        if (request.getQuantity() < 0) {
            throw new BadRequestException("quantity must be zero or greater");
        }
    }

    private void validateUpdate(InventoryMutationRequestDto request) {
        if (request == null) {
            throw new BadRequestException("request body is required");
        }
        if (!StringUtils.hasText(request.getName()) && request.getQuantity() == null) {
            throw new BadRequestException("name or quantity is required");
        }
    }

    private InventoryItemDto toDto(InventoryItem item) {
        return new InventoryItemDto(
                item.getId(),
                item.getSku(),
                item.getName(),
                item.getQuantity(),
                item.getUpdatedAt(),
                item.getVersion());
    }
}
