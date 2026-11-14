package com.stocksync.server.repository;

import com.stocksync.server.entity.PeerNode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for peer nodes.
 */
public interface PeerNodeRepository extends JpaRepository<PeerNode, Long> {
    Optional<PeerNode> findByIpAddress(String ipAddress);
}
