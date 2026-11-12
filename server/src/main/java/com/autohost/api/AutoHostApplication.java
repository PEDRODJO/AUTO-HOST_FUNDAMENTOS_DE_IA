package com.autohost.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AutoHostApplication {
    public static void main(String[] args) { SpringApplication.run(AutoHostApplication.class, args); }
}
