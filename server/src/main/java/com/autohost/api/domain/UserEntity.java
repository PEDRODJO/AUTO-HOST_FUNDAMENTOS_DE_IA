package com.autohost.api.domain;
import jakarta.persistence.*;
@Entity @Table(name="Users")
public class UserEntity {
    @Id @Column(name="UserId", length=36, columnDefinition="CHAR(36)") public String id;
    @Column(name="Email", length=254, nullable=false) public String email;
    @Column(name="DisplayName", length=120, nullable=false) public String displayName;
    @Column(name="IsActive", nullable=false, columnDefinition="TINYINT(1)") public Boolean active;
}
