package com.autohost.api.service;
import com.autohost.api.config.AppProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import java.util.Properties;
@Service
public class MailService {
    private final AppProperties properties;
    public MailService(AppProperties properties) { this.properties = properties; }
    public boolean send(String to, String subject, String body) {
        if (properties.smtpHost() == null || properties.smtpHost().isBlank()) return false;
        try {
            var sender = new JavaMailSenderImpl(); sender.setHost(properties.smtpHost()); sender.setPort(properties.smtpPort());
            sender.setUsername(properties.smtpUser()); sender.setPassword(properties.smtpPass());
            Properties config = sender.getJavaMailProperties(); config.put("mail.smtp.auth", "true"); config.put("mail.smtp.starttls.enable", "true"); config.put("mail.smtp.connectiontimeout", "5000");
            SimpleMailMessage message = new SimpleMailMessage(); message.setFrom(properties.emailFrom()); message.setTo(to); message.setSubject(subject); message.setText(body); sender.send(message); return true;
        } catch (RuntimeException ex) { return false; }
    }
}
