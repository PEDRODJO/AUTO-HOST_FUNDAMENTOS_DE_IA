package com.autohost.api.web;

import com.autohost.api.config.AppProperties;
import com.autohost.api.security.ApiPrincipal;
import com.autohost.api.security.JwtService;
import com.autohost.api.service.MailService;
import com.autohost.api.service.PasswordService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AuthController {
    @PersistenceContext EntityManager em;
    private final PasswordService passwords; private final JwtService jwt; private final MailService mail; private final AppProperties props;
    public AuthController(PasswordService passwords, JwtService jwt, MailService mail, AppProperties props) { this.passwords=passwords; this.jwt=jwt; this.mail=mail; this.props=props; }

    @PostMapping("/auth/login") @Transactional(readOnly=true)
    public Map<String,Object> login(@RequestBody Map<String,Object> body) {
        String email = text(body,"email").toLowerCase(Locale.ROOT), password = text(body,"password");
        List<?> rows = em.createNativeQuery("SELECT u.UserId,u.Email,u.DisplayName,i.PasswordSalt,i.PasswordHash,i.HashIterations, GROUP_CONCAT(DISTINCT r.RoleName ORDER BY r.RoleName SEPARATOR ',') Roles FROM Users u JOIN IdentityCredentials i ON i.UserId=u.UserId LEFT JOIN UserAdministration a ON a.UserId=u.UserId LEFT JOIN Roles r ON r.RoleId=a.RoleId AND r.IsActive=1 WHERE u.Email=:email AND u.IsActive=1 GROUP BY u.UserId,u.Email,u.DisplayName,i.PasswordSalt,i.PasswordHash,i.HashIterations")
                .setParameter("email", email).getResultList();
        if (rows.isEmpty()) throw new ApiException(HttpStatus.UNAUTHORIZED,"Correo o contraseña incorrectos.");
        Object[] row=(Object[])rows.get(0);
        if (!passwords.matches(password, String.valueOf(row[3]), String.valueOf(row[4]), ((Number)row[5]).intValue())) throw new ApiException(HttpStatus.UNAUTHORIZED,"Correo o contraseña incorrectos.");
        List<String> roles = row[6] == null ? List.of() : Arrays.asList(String.valueOf(row[6]).split(","));
        String token=jwt.issue(String.valueOf(row[0]),String.valueOf(row[1]),String.valueOf(row[2]),roles);
        return Map.of("token",token,"user",Map.of("email",row[1],"name",row[2],"roles",roles));
    }

    @PostMapping("/auth/register") @Transactional
    public ResponseEntity<?> register(@RequestBody Map<String,Object> body) {
        String email=text(body,"email").trim().toLowerCase(Locale.ROOT), name=text(body,"name").trim(), password=text(body,"password");
        if(email.isBlank()||name.isBlank()||password.length()<10) throw new ApiException(HttpStatus.BAD_REQUEST,"Indica nombre, correo y contraseña de al menos 10 caracteres.");
        String id=UUID.randomUUID().toString(); String[] record=passwords.hash(password);
        List<?> clientRoles=em.createNativeQuery("SELECT RoleId FROM Roles WHERE RoleName='cliente' AND IsActive=1 LIMIT 1").getResultList();
        if(clientRoles.isEmpty()) throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"No está configurado el rol cliente.");
        Object role=clientRoles.get(0);
        em.createNativeQuery("INSERT INTO Users(UserId,Email,DisplayName) VALUES(:id,:email,:name)").setParameter("id",id).setParameter("email",email).setParameter("name",name).executeUpdate();
        em.createNativeQuery("INSERT INTO IdentityCredentials(IdentityId,UserId,PasswordSalt,PasswordHash,HashIterations) VALUES(:identity,:id,:salt,:hash,:iterations)").setParameter("identity",UUID.randomUUID().toString()).setParameter("id",id).setParameter("salt",record[0]).setParameter("hash",record[1]).setParameter("iterations",Integer.parseInt(record[2])).executeUpdate();
        em.createNativeQuery("INSERT INTO UserAdministration(AssignmentId,UserId,RoleId) VALUES(:assignment,:id,:role)").setParameter("assignment",UUID.randomUUID().toString()).setParameter("id",id).setParameter("role",role).executeUpdate();
        boolean sent=mail.send(email,"Bienvenida al sistema de Gestión de Talleres","Hola "+name+", tu cuenta fue creada correctamente. Ya puedes iniciar sesión.");
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("emailSent",sent,"message",sent?"Cuenta creada. Revisa tu correo de bienvenida.":"La cuenta se creó, pero no se pudo enviar el correo de bienvenida."));
    }

    @PostMapping("/auth/recovery") @Transactional(noRollbackFor=ApiException.class)
    public Map<String,String> recovery(@RequestBody Map<String,Object> body) {
        String email=text(body,"email").trim().toLowerCase(Locale.ROOT);
        List<?> users=em.createNativeQuery("SELECT UserId,DisplayName FROM Users WHERE Email=:email AND IsActive=1").setParameter("email",email).getResultList();
        if(!users.isEmpty()) {
            Object[] user=(Object[])users.get(0); byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes); String token=HexFormat.of().formatHex(bytes);
            String digest=sha256(token);
            em.createNativeQuery("INSERT INTO PasswordResetTokens(ResetId,UserId,TokenHash,ExpiresAt) VALUES(:id,:user,:hash,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))").setParameter("id",UUID.randomUUID().toString()).setParameter("user",user[0]).setParameter("hash",digest).executeUpdate();
            boolean sent=mail.send(email,"Restablece tu contraseña — Gestión de Talleres","Abre este enlace en los próximos 30 minutos: "+props.frontendBaseUrl()+"/reset-password?token="+token);
            if(!sent) {
                em.createNativeQuery("UPDATE PasswordResetTokens SET UsedAt=UTC_TIMESTAMP() WHERE TokenHash=:hash").setParameter("hash",digest).executeUpdate();
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"No fue posible enviar el correo. Inténtalo de nuevo más tarde.");
            }
        }
        return Map.of("message","Correo enviado exitosamente. Por favor revisa tu bandeja de entrada.");
    }

    @PostMapping("/auth/reset") @Transactional
    public Map<String,String> reset(@RequestBody Map<String,Object> body) {
        String token=text(body,"token"), password=text(body,"password");
        if(token.isBlank()||password.length()<10) throw new ApiException(HttpStatus.BAD_REQUEST,"Token y contraseña de al menos 10 caracteres requeridos.");
        List<?> rows=em.createNativeQuery("SELECT ResetId,UserId FROM PasswordResetTokens WHERE TokenHash=:hash AND UsedAt IS NULL AND ExpiresAt>UTC_TIMESTAMP() LIMIT 1 FOR UPDATE").setParameter("hash",sha256(token)).getResultList();
        if(rows.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST,"El enlace no es válido o ha caducado.");
        Object[] row=(Object[])rows.get(0); String[] record=passwords.hash(password);
        em.createNativeQuery("UPDATE IdentityCredentials SET PasswordSalt=:salt,PasswordHash=:hash,HashIterations=:iterations,UpdatedAt=UTC_TIMESTAMP() WHERE UserId=:user").setParameter("salt",record[0]).setParameter("hash",record[1]).setParameter("iterations",Integer.parseInt(record[2])).setParameter("user",row[1]).executeUpdate();
        em.createNativeQuery("UPDATE PasswordResetTokens SET UsedAt=UTC_TIMESTAMP() WHERE ResetId=:id").setParameter("id",row[0]).executeUpdate();
        return Map.of("message","Contraseña actualizada. Inicia sesión con tu nueva clave.");
    }
    @GetMapping("/me") public Map<String,Object> me(org.springframework.security.core.Authentication authentication) {
        ApiPrincipal user=(ApiPrincipal)authentication.getPrincipal(); return Map.of("user",Map.of("email",user.email(),"name",user.name(),"roles",user.roles()));
    }
    private static String text(Map<String,Object> body,String key) { Object value=body.get(key); return value==null?"":String.valueOf(value); }
    private static String sha256(String value) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8))); } catch(Exception e){throw new IllegalStateException(e);} }
}
