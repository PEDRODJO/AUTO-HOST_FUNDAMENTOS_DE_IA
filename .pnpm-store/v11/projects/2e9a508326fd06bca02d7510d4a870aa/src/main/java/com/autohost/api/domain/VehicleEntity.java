package com.autohost.api.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity @Table(name="Vehiculos", uniqueConstraints={@UniqueConstraint(name="UQ_Vehiculos_VIN", columnNames="VIN"), @UniqueConstraint(name="UQ_Vehiculos_Placa", columnNames="Placa")})
public class VehicleEntity {
    @Id @Column(name="id", length=36, columnDefinition="CHAR(36)") public String id;
    @Column(name="VIN", nullable=false, length=17) public String vin;
    @Column(name="Placa", nullable=false, length=10) public String plate;
    @Column(name="Marca", nullable=false, length=80) public String brand;
    @Column(name="Modelo", nullable=false, length=80) public String model;
    @Column(name="Anio", nullable=false) public Integer year;
    @Column(name="Version", nullable=false, length=100) public String version;
    @Column(name="Color", nullable=false, length=50) public String color;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="Fotos", nullable=false, columnDefinition="json") public String photos;
    @Column(name="Estatus", nullable=false, columnDefinition="ENUM('activo','en_taller','desactivado')") public String status;
    @Column(name="IsActive", nullable=false, columnDefinition="TINYINT(1)") public Boolean active;
    @Column(name="MecanicoId", length=36, columnDefinition="CHAR(36)") public String mechanicId;
    @Column(name="ClienteId", length=36, columnDefinition="CHAR(36)") public String clientId;
    @Column(name="CreatedAt", insertable=false, updatable=false) public LocalDateTime createdAt;
    @Column(name="UpdatedAt", insertable=false, updatable=false) public LocalDateTime updatedAt;
}
