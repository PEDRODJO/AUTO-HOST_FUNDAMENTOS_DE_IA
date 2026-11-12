package com.autohost.api.web;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/sepomex")
public class SepomexController {
 @PersistenceContext EntityManager em;
 @GetMapping("/{cp}") @Transactional(readOnly=true) public Map<String,Object> byCp(@PathVariable String cp){if(!cp.matches("\\d{5}"))throw new ApiException(HttpStatus.BAD_REQUEST,"El código postal debe contener cinco dígitos.");List<?>rows=em.createNativeQuery("SELECT estado,municipio,colonia FROM Codigos_Postales WHERE codigo_postal=:cp").setParameter("cp",cp).getResultList();if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"No se encontró ese código postal.");Object[]first=(Object[])rows.get(0);List<String>colonias=rows.stream().map(r->String.valueOf(((Object[])r)[2])).distinct().toList();return Map.of("codigo_postal",cp,"estado",first[0],"municipio",first[1],"colonias",colonias);}
}
