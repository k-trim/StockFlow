package com.stocksync.server.dto;

import java.time.Instant;

/**
 * API DTO for peer nodes.
 */
public class PeerNodeDto {
    private Long id;
    private String ipAddress;
    private String status;
    private Instant lastSeen;

    public PeerNodeDto() {
    }

    public PeerNodeDto(Long id, String ipAddress, String status, Instant lastSeen) {
        this.id = id;
        this.ipAddress = ipAddress;
        this.status = status;
        this.lastSeen = lastSeen;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(Instant lastSeen) {
        this.lastSeen = lastSeen;
    }
}
