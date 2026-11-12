package com.autohost.api.web;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/clients")
public class ClientController {
    @PersistenceContext EntityManager em;
    private static final String[] FIELDS={"Nombre","ApellidoPaterno","ApellidoMaterno","Email","TelefonoPersonal","TelefonoTrabajo","TelefonoEmergencia","NombreContactoEmergencia","ApellidoPaternoContactoEmergencia","ApellidoMaternoContactoEmergencia","Calle","Numero","Colonia","Estado","Municipio","CodigoPostal","TallerId"};
    @GetMapping @Transactional(readOnly=true) public Map<String,Object> list(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="10") int pageSize) {
        int size=Math.min(10,Math.max(1,pageSize)), p=Math.max(1,page), offset=(p-1)*size;
        Number count=(Number)em.createNativeQuery("SELECT COUNT(*) FROM Clients WHERE IsActive=1").getSingleResult();
        List<?> rows=em.createNativeQuery("SELECT c.ClientId,c.Nombre,c.ApellidoPaterno,c.ApellidoMaterno,c.Email,c.TelefonoPersonal,c.TelefonoTrabajo,c.TelefonoEmergencia,c.NombreContactoEmergencia,c.ApellidoPaternoContactoEmergencia,c.ApellidoMaternoContactoEmergencia,c.Calle,c.Numero,c.Colonia,c.Estado,c.Municipio,c.CodigoPostal,c.TallerId,t.nombre TallerNombre,c.IsActive FROM Clients c LEFT JOIN Talleres t ON t.id=c.TallerId WHERE c.IsActive=1 ORDER BY c.Nombre,c.ApellidoPaterno,c.ClientId LIMIT :size OFFSET :offset").setParameter("size",size).setParameter("offset",offset).getResultList();
        return page(rows,count,p,size);
    }
    @GetMapping("/vehicle-assignment") @Transactional(readOnly=true) public Map<String,Object> assignmentClients(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="10") int pageSize) {
        int size=Math.min(10,Math.max(1,pageSize)), p=Math.max(1,page), offset=(p-1)*size;
        Number count=(Number)em.createNativeQuery("SELECT COUNT(*) FROM Clients WHERE IsActive=1").getSingleResult();
        List<?> rows=em.createNativeQuery("SELECT ClientId,Nombre,ApellidoPaterno,ApellidoMaterno FROM Clients WHERE IsActive=1 ORDER BY Nombre,ApellidoPaterno,ClientId LIMIT :size OFFSET :offset").setParameter("size",size).setParameter("offset",offset).getResultList();
        return page(rows,count,p,size);
    }
    private Map<String,Object> page(List<?> rows,Number count,int p,int size) {
        List<Map<String,Object>> items=rows.stream().map(row->{Object[] r=(Object[])row; Map<String,Object> m=new LinkedHashMap<>();
            if(r.length==4){m.put("ClientId",r[0]);m.put("Nombre",r[1]);m.put("ApellidoPaterno",r[2]);m.put("ApellidoMaterno",r[3]);}
            else {String[] names={"ClientId","Nombre","ApellidoPaterno","ApellidoMaterno","Email","TelefonoPersonal","TelefonoTrabajo","TelefonoEmergencia","NombreContactoEmergencia","ApellidoPaternoContactoEmergencia","ApellidoMaternoContactoEmergencia","Calle","Numero","Colonia","Estado","Municipio","CodigoPostal","TallerId","TallerNombre","IsActive"};for(int i=0;i<names.length;i++)m.put(names[i],r[i]);} return m;}).toList();
        long total=count.longValue(); return Map.of("items",items,"total",total,"page",p,"pageSize",size,"totalPages",(total+size-1)/size);
    }
    @PostMapping @Transactional public ResponseEntity<?> create(@RequestBody Map<String,Object> body) {
        Map<String,String> input=validate(body); ensureWorkshop(input.get("TallerId")); String id=UUID.randomUUID().toString();
        String columns=String.join(",",FIELDS); String params=String.join(",",Arrays.stream(FIELDS).map(f->":"+f).toList());
        var q=em.createNativeQuery("INSERT INTO Clients(ClientId,"+columns+") VALUES(:id,"+params+")").setParameter("id",id);
        for(String field:FIELDS) q.setParameter(field,input.get(field).isBlank()?null:input.get(field)); q.executeUpdate();
        return ResponseEntity.status(201).body(Map.of("ClientId",id,"message","Cliente creado correctamente."));
    }
    @PutMapping("/{id}") @Transactional public Map<String,String> update(@PathVariable String id,@RequestBody Map<String,Object> body) {
        Map<String,String> input=validate(body); ensureWorkshop(input.get("TallerId"));
        String set=String.join(",",Arrays.stream(FIELDS).map(f->f+"=:"+f).toList());
        var q=em.createNativeQuery("UPDATE Clients SET "+set+" WHERE ClientId=:id AND IsActive=1").setParameter("id",id);
        for(String field:FIELDS)q.setParameter(field,input.get(field).isBlank()?null:input.get(field));
        if(q.executeUpdate()==0) throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró el cliente activo."); return Map.of("message","Cliente actualizado correctamente.");
    }
    @DeleteMapping("/{id}") @Transactional public Map<String,String> remove(@PathVariable String id) {
        if(em.createNativeQuery("UPDATE Clients SET IsActive=0 WHERE ClientId=:id AND IsActive=1").setParameter("id",id).executeUpdate()==0) throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró el cliente activo."); return Map.of("message","Cliente desactivado correctamente.");
    }
    @GetMapping("/{id}/vehicles") @Transactional(readOnly=true) public Map<String,Object> vehicles(@PathVariable String id) {
        if(em.createNativeQuery("SELECT ClientId FROM Clients WHERE ClientId=:id AND IsActive=1").setParameter("id",id).getResultList().isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró el cliente activo.");
        List<?> assigned=em.createNativeQuery("SELECT id,VIN,Placa,Marca,Modelo,Anio,Estatus,IsActive FROM Vehiculos WHERE ClienteId=:id ORDER BY CreatedAt DESC").setParameter("id",id).getResultList();
        List<?> available=em.createNativeQuery("SELECT id,VIN,Placa,Marca,Modelo,Anio FROM Vehiculos WHERE ClienteId IS NULL AND IsActive=1 AND Estatus='activo' ORDER BY Marca,Modelo,Anio DESC").getResultList();
        return Map.of("assigned",maps(assigned,new String[]{"id","VIN","Placa","Marca","Modelo","Anio","Estatus","IsActive"}),"available",maps(available,new String[]{"id","VIN","Placa","Marca","Modelo","Anio"}));
    }
    @PutMapping("/{id}/vehicles") @Transactional public Map<String,String> associate(@PathVariable String id,@RequestBody Map<String,Object> body) {
        String vehicle=Objects.toString(body.get("vehicleId"),"");
        if(em.createNativeQuery("SELECT ClientId FROM Clients WHERE ClientId=:id AND IsActive=1 FOR UPDATE").setParameter("id",id).getResultList().isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró el cliente activo.");
        List<?> rows=em.createNativeQuery("SELECT ClienteId,IsActive,Estatus FROM Vehiculos WHERE id=:vehicle FOR UPDATE").setParameter("vehicle",vehicle).getResultList();
        if(rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró un vehículo activo."); Object[] row=(Object[])rows.get(0);
        if(row[0]!=null||((Number)row[1]).intValue()!=1||!"activo".equals(row[2])) throw new ApiException(HttpStatus.CONFLICT,"El vehículo ya no está disponible para asignarse.");
        if(em.createNativeQuery("UPDATE Vehiculos SET ClienteId=:client WHERE id=:vehicle AND ClienteId IS NULL AND IsActive=1 AND Estatus='activo'").setParameter("client",id).setParameter("vehicle",vehicle).executeUpdate()!=1) throw new ApiException(HttpStatus.CONFLICT,"El vehículo ya no está disponible para asignarse.");
        return Map.of("message","Vehículo asociado correctamente al cliente.");
    }
    private void ensureWorkshop(String id){if(id==null||em.createNativeQuery("SELECT t.id FROM Talleres t JOIN Estatus e ON e.id=t.fk_estatus WHERE t.id=:id AND e.nombre_estatus='activo' AND t.IsActive=1").setParameter("id",id).getResultList().isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST,"El taller seleccionado no existe.");}
    private Map<String,String> validate(Map<String,Object>b){Map<String,String> v=new HashMap<>();for(String f:FIELDS)v.put(f,Objects.toString(b.get(f),"").trim());v.put("Email",v.get("Email").toLowerCase(Locale.ROOT));for(String f:new String[]{"Nombre","ApellidoPaterno","Email","TelefonoPersonal","TelefonoEmergencia","NombreContactoEmergencia","ApellidoPaternoContactoEmergencia","Calle","Numero","Colonia","Estado","Municipio","CodigoPostal","TallerId"})if(v.get(f).isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"El campo "+f+" es obligatorio.");if(!v.get("Email").matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))throw new ApiException(HttpStatus.BAD_REQUEST,"El correo electrónico no es válido.");return v;}
    private static List<Map<String,Object>> maps(List<?> rows,String[] names){return rows.stream().map(x->{Object[] r=(Object[])x;Map<String,Object>m=new LinkedHashMap<>();for(int i=0;i<names.length;i++)m.put(names[i],r[i]);return m;}).toList();}
}
