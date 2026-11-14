package com.stocksync.server.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI metadata for REST endpoints.
 */
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI stockSyncOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("StockSync API")
                        .version("v1")
                        .description("REST API for inventory synchronization"));
    }
}
