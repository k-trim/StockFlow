package com.stocksync.server.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.stocksync.server.dto.InventorySyncMessageDto;
import com.stocksync.server.entity.InventoryItem;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.support.ExecutorSubscribableChannel;

/**
 * Unit tests for conflict resolution rules.
 */
class InventorySyncServiceTest {
    private InventorySyncService service;

    @BeforeEach
    void setUp() {
        SimpMessagingTemplate messagingTemplate = new SimpMessagingTemplate(new ExecutorSubscribableChannel());
        // Only conflict resolution is exercised; other dependencies are unused in these
        // tests.
        service = new InventorySyncService(null, messagingTemplate, null);
    }

    @Test
    void resolveConflict_prefersNewerTimestamp() {
        InventoryItem existing = new InventoryItem();
        existing.setUpdatedAt(Instant.parse("2026-04-29T10:00:00Z"));
        existing.setVersion(10L);

        InventorySyncMessageDto incoming = new InventorySyncMessageDto();
        incoming.setUpdatedAt(Instant.parse("2026-04-29T10:05:00Z"));
        incoming.setVersion(1L);

        assertTrue(service.resolveConflict(existing, incoming));
    }

    @Test
    void resolveConflict_tieBreaksOnVersion() {
        Instant timestamp = Instant.parse("2026-04-29T10:00:00Z");

        InventoryItem existing = new InventoryItem();
        existing.setUpdatedAt(timestamp);
        existing.setVersion(3L);

        InventorySyncMessageDto incoming = new InventorySyncMessageDto();
        incoming.setUpdatedAt(timestamp);
        incoming.setVersion(4L);

        assertTrue(service.resolveConflict(existing, incoming));
    }

    @Test
    void resolveConflict_rejectsOlderTimestampEvenWithNewerVersion() {
        InventoryItem existing = new InventoryItem();
        existing.setUpdatedAt(Instant.parse("2026-04-29T10:00:00Z"));
        existing.setVersion(3L);

        InventorySyncMessageDto incoming = new InventorySyncMessageDto();
        incoming.setUpdatedAt(Instant.parse("2026-04-29T09:59:59Z"));
        incoming.setVersion(999L);

        assertFalse(service.resolveConflict(existing, incoming));
    }

    @Test
    void resolveConflict_allowsVersionWhenTimestampMissing() {
        InventoryItem existing = new InventoryItem();
        existing.setUpdatedAt(Instant.parse("2026-04-29T10:00:00Z"));
        existing.setVersion(1L);

        InventorySyncMessageDto incoming = new InventorySyncMessageDto();
        incoming.setUpdatedAt(null);
        incoming.setVersion(2L);

        assertTrue(service.resolveConflict(existing, incoming));
    }
}
