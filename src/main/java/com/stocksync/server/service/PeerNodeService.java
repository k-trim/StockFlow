package com.stocksync.server.service;

import com.stocksync.server.dto.PeerNodeDto;
import com.stocksync.server.entity.PeerNode;
import com.stocksync.server.repository.PeerNodeRepository;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Business logic for tracking peer node health.
 */
@Service
public class PeerNodeService {
    private final PeerNodeRepository repository;

    public PeerNodeService(PeerNodeRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PeerNodeDto> getAllPeers() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void recordHeartbeat(String ipAddress) {
        if (!StringUtils.hasText(ipAddress)) {
            return;
        }

        String normalized = ipAddress.trim();
        PeerNode node = repository.findByIpAddress(normalized)
                .orElseGet(() -> {
                    PeerNode created = new PeerNode();
                    created.setIpAddress(normalized);
                    created.setStatus("ACTIVE");
                    return created;
                });

        node.setLastSeen(Instant.now());
        node.setStatus("ACTIVE");
        repository.save(node);
    }

    private PeerNodeDto toDto(PeerNode node) {
        return new PeerNodeDto(
                node.getId(),
                node.getIpAddress(),
                node.getStatus(),
                node.getLastSeen());
    }
}
