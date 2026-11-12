package com.autohost.api.domain;
import jakarta.persistence.*;
@Entity @Table(name="Roles")
public class RoleEntity {
    @Id @Column(name="RoleId", length=36, columnDefinition="CHAR(36)") public String id;
    @Column(name="RoleName", length=60, nullable=false) public String name;
    @Column(name="Description", length=250) public String description;
    @Column(name="IsActive", nullable=false, columnDefinition="TINYINT(1)") public Boolean active;
}
