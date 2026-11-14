package com.stocksync.server.controller;

import com.stocksync.server.dto.PeerNodeDto;
import com.stocksync.server.service.PeerNodeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST API for peer node visibility.
 */
@RestController
@RequestMapping("/api/peers")
@Tag(name = "Peers")
public class PeerNodeController {
    private final PeerNodeService peerNodeService;

    public PeerNodeController(PeerNodeService peerNodeService) {
        this.peerNodeService = peerNodeService;
    }

    @GetMapping
    public List<PeerNodeDto> listPeers() {
        return peerNodeService.getAllPeers();
    }
}
