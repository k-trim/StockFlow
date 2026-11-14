package com.stocksync.server.service;

import com.stocksync.server.dto.InventoryItemDto;
import com.stocksync.server.dto.InventorySyncMessageDto;
import com.stocksync.server.entity.InventoryItem;
import com.stocksync.server.exception.BadRequestException;
import com.stocksync.server.repository.InventoryItemRepository;
import java.time.Instant;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Business logic for peer-to-peer synchronization.
 */
@Service
public class InventorySyncService {
    private final InventoryItemRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PeerNodeService peerNodeService;

    public InventorySyncService(
            InventoryItemRepository repository,
            SimpMessagingTemplate messagingTemplate,
            PeerNodeService peerNodeService) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
        this.peerNodeService = peerNodeService;
    }

    @Transactional
    public InventoryItemDto applyIncomingSync(InventorySyncMessageDto message) {
        validateMessage(message);

        String sku = message.getSku().trim();
        message.setSku(sku);
        if (StringUtils.hasText(message.getName())) {
            message.setName(message.getName().trim());
        }
        peerNodeService.recordHeartbeat(message.getSourceNodeIp());

        InventoryItem existing = repository.findBySku(sku).orElse(null);
        if (existing == null) {
            if (!StringUtils.hasText(message.getName())) {
                throw new BadRequestException("name is required for new items");
            }
            InventoryItem created = new InventoryItem();
            applyIncoming(created, message);
            InventoryItem saved = repository.save(created);
            InventoryItemDto payload = toDto(saved);
            broadcastInventoryMutation(payload);
            return payload;
        }

        if (!resolveConflict(existing, message)) {
            return toDto(existing);
        }

        applyIncoming(existing, message);
        InventoryItem saved = repository.save(existing);
        InventoryItemDto payload = toDto(saved);
        broadcastInventoryMutation(payload);
        return payload;
    }

    /**
     * Last-write-wins using updatedAt with a version tie-breaker.
     */
    public boolean resolveConflict(InventoryItem existing, InventorySyncMessageDto incoming) {
        Instant existingTimestamp = existing.getUpdatedAt();
        Instant incomingTimestamp = incoming.getUpdatedAt();

        if (incomingTimestamp != null && (existingTimestamp == null || incomingTimestamp.isAfter(existingTimestamp))) {
            return true;
        }

        if (incomingTimestamp != null && existingTimestamp != null && incomingTimestamp.equals(existingTimestamp)) {
            return isIncomingVersionNewer(existing.getVersion(), incoming.getVersion());
        }

        if (incomingTimestamp == null) {
            return isIncomingVersionNewer(existing.getVersion(), incoming.getVersion());
        }

        return false;
    }

    public void broadcastInventoryMutation(InventoryItemDto payload) {
        messagingTemplate.convertAndSend("/topic/inventory", payload);
    }

    private void validateMessage(InventorySyncMessageDto message) {
        if (message == null) {
            throw new BadRequestException("message body is required");
        }
        if (!StringUtils.hasText(message.getSku())) {
            throw new BadRequestException("sku is required");
        }
        if (message.getQuantity() == null) {
            throw new BadRequestException("quantity is required");
        }
        if (message.getQuantity() < 0) {
            throw new BadRequestException("quantity must be zero or greater");
        }
    }

    private boolean isIncomingVersionNewer(Long existingVersion, Long incomingVersion) {
        if (incomingVersion == null) {
            return false;
        }
        if (existingVersion == null) {
            return true;
        }
        return incomingVersion > existingVersion;
    }

    private void applyIncoming(InventoryItem entity, InventorySyncMessageDto incoming) {
        entity.setSku(incoming.getSku());
        if (StringUtils.hasText(incoming.getName())) {
            entity.setName(incoming.getName());
        }
        entity.setQuantity(incoming.getQuantity());
        entity.setUpdatedAt(incoming.getUpdatedAt() != null ? incoming.getUpdatedAt() : Instant.now());
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
