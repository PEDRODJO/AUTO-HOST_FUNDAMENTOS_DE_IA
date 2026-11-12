package com.autohost.api.security;

import com.autohost.api.config.AppProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {
    private final SecretKey key;
    private final Duration ttl;
    public JwtService(AppProperties properties) {
        if (properties.jwtSecret() == null || properties.jwtSecret().length() < 32) throw new IllegalStateException("JWT_SECRET debe tener al menos 32 caracteres.");
        try { this.key = Keys.hmacShaKeyFor(MessageDigest.getInstance("SHA-256").digest(properties.jwtSecret().getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
        this.ttl = Duration.parse("PT" + properties.jwtExpiresIn().toUpperCase().replace("H", "H").replace("M", "M"));
    }
    public String issue(String userId, String email, String name, List<String> roles) {
        Instant now = Instant.now();
        return Jwts.builder().subject(userId).claim("email", email).claim("name", name).claim("roles", roles)
                .issuedAt(Date.from(now)).expiration(Date.from(now.plus(ttl))).signWith(key).compact();
    }
    public io.jsonwebtoken.Claims parse(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
}
