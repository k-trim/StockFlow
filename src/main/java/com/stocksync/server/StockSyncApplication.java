package com.stocksync.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Application entry point.
 */
@SpringBootApplication
public class StockSyncApplication {
    public static void main(String[] args) {
        SpringApplication.run(StockSyncApplication.class, args);
    }
}
