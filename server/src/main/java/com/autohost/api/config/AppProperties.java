package com.autohost.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "autohost")
public record AppProperties(String jwtSecret, String jwtExpiresIn, String passwordPepper,
                            String uploadRoot, String frontendBaseUrl, String mailMode,
                            String emailFrom, String smtpHost, int smtpPort,
                            String smtpUser, String smtpPass) { }
