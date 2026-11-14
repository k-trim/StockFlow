package com.stocksync.server.controller;

import com.stocksync.server.dto.InventorySyncMessageDto;
import com.stocksync.server.service.InventorySyncService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

/**
 * STOMP controller for peer-to-peer sync messages.
 */
@Controller
public class SyncController {
    private final InventorySyncService syncService;

    public SyncController(InventorySyncService syncService) {
        this.syncService = syncService;
    }

    @MessageMapping("/inventory.sync")
    public void handleInventorySync(InventorySyncMessageDto message) {
        syncService.applyIncomingSync(message);
    }
}
