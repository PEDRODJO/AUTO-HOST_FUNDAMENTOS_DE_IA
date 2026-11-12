package com.autohost.api.web;
import jakarta.persistence.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/roles")
public class RoleController {
 @PersistenceContext EntityManager em;
 @GetMapping @Transactional(readOnly=true) public List<Map<String,Object>> list(){return maps(em.createNativeQuery("SELECT RoleId,RoleName,Description,IsActive,CreatedAt,UpdatedAt FROM Roles ORDER BY IsActive DESC,RoleName").getResultList(),new String[]{"RoleId","RoleName","Description","IsActive","CreatedAt","UpdatedAt"});}
 @PostMapping @Transactional public ResponseEntity<?> create(@RequestBody Map<String,Object>b){String name=Objects.toString(b.get("name"),"").trim(),description=Objects.toString(b.get("description"),"").trim();validate(name,description);String id=UUID.randomUUID().toString();em.createNativeQuery("INSERT INTO Roles(RoleId,RoleName,Description) VALUES(:id,:name,:description)").setParameter("id",id).setParameter("name",name).setParameter("description",description.isBlank()?null:description).executeUpdate();return ResponseEntity.status(201).body(Map.of("RoleId",id,"RoleName",name,"Description",description));}
 @PutMapping("/{id}") @Transactional public Map<String,String>update(@PathVariable String id,@RequestBody Map<String,Object>b){String name=Objects.toString(b.get("name"),"").trim(),description=Objects.toString(b.get("description"),"").trim();validate(name,description);if(em.createNativeQuery("UPDATE Roles SET RoleName=:name,Description=:description WHERE RoleId=:id AND IsActive=1").setParameter("name",name).setParameter("description",description.isBlank()?null:description).setParameter("id",id).executeUpdate()==0)throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró el rol activo.");return Map.of("message","Rol actualizado correctamente.");}
 @DeleteMapping("/{id}") @Transactional public Map<String,String>suspend(@PathVariable String id){if(em.createNativeQuery("UPDATE Roles SET IsActive=0 WHERE RoleId=:id AND IsActive=1").setParameter("id",id).executeUpdate()==0)throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró el rol activo.");return Map.of("message","Rol suspendido correctamente.");}
 private static void validate(String n,String d){if(!n.matches("[\\p{L}\\p{N} _-]{2,60}"))throw new ApiException(HttpStatus.BAD_REQUEST,"El nombre del rol debe tener entre 2 y 60 caracteres alfanuméricos.");if(d.length()>250)throw new ApiException(HttpStatus.BAD_REQUEST,"La descripción no puede superar 250 caracteres.");}
 private static List<Map<String,Object>>maps(List<?> rows,String[]keys){return rows.stream().map(o->{Object[]r=(Object[])o;Map<String,Object>m=new LinkedHashMap<>();for(int i=0;i<keys.length;i++)m.put(keys[i],r[i]);return m;}).toList();}
}
