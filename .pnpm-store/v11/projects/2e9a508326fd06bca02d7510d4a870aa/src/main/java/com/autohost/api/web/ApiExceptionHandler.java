package com.autohost.api.web;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import java.util.Map;
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class) ResponseEntity<?> api(ApiException e) { return ResponseEntity.status(e.status()).body(Map.of("error", e.getMessage())); }
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> duplicate(DataIntegrityViolationException e) { return ResponseEntity.status(409).body(Map.of("error", "El registro ya existe o infringe una relación de datos.")); }
    @ExceptionHandler(MaxUploadSizeExceededException.class) ResponseEntity<?> upload() { return ResponseEntity.badRequest().body(Map.of("error", "Cada fotografía puede pesar como máximo 15 MB.")); }
    @ExceptionHandler(Exception.class) ResponseEntity<?> fallback(Exception e) { return ResponseEntity.status(500).body(Map.of("error", "Ocurrió un error interno.")); }
}
