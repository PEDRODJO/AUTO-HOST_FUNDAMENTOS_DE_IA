package com.autohost.api.service;

import com.autohost.api.config.AppProperties;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;

@Service
public class PasswordService {
    private static final int ITERATIONS = 600_000;
    private final AppProperties properties;
    private final SecureRandom random = new SecureRandom();
    public PasswordService(AppProperties properties) { this.properties = properties; }
    public String[] hash(String password) {
        byte[] salt = new byte[16]; random.nextBytes(salt);
        return new String[]{HexFormat.of().formatHex(salt), derive(password, salt, ITERATIONS), String.valueOf(ITERATIONS)};
    }
    public boolean matches(String password, String saltHex, String expectedHex, int iterations) {
        try { return MessageDigest.isEqual(HexFormat.of().parseHex(expectedHex), HexFormat.of().parseHex(derive(password, HexFormat.of().parseHex(saltHex), iterations))); }
        catch (RuntimeException e) { return false; }
    }
    private String derive(String password, byte[] salt, int iterations) {
        PBEKeySpec spec = new PBEKeySpec((password + (properties.passwordPepper() == null ? "" : properties.passwordPepper())).toCharArray(), salt, iterations, 512);
        try { return HexFormat.of().formatHex(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512").generateSecret(spec).getEncoded()); }
        catch (Exception e) { throw new IllegalStateException("No se pudo validar la contraseña.", e); }
        finally { spec.clearPassword(); }
    }
}
