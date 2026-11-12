package com.autohost.api.domain;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ClientRepository extends JpaRepository<ClientEntity, String> { }
