package com.autohost.api.domain;
import jakarta.persistence.*;
@Entity @Table(name="Clients")
public class ClientEntity {
    @Id @Column(name="ClientId", length=36, columnDefinition="CHAR(36)") public String id;
    @Column(name="Nombre", length=80, nullable=false) public String name;
    @Column(name="ApellidoPaterno", length=80, nullable=false) public String surname;
    @Column(name="ApellidoMaterno", length=80) public String secondSurname;
    @Column(name="Email", length=254, nullable=false) public String email;
    @Column(name="TallerId", length=36, columnDefinition="CHAR(36)") public String workshopId;
    @Column(name="IsActive", nullable=false, columnDefinition="TINYINT(1)") public Boolean active;
}
