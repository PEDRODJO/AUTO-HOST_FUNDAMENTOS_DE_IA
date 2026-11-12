package com.autohost.api.security;
import java.util.List;
public record ApiPrincipal(String id, String email, String name, List<String> roles) { }
