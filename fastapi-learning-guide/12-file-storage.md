# 12 — Almacenamiento de Archivos (S3 Compatible)

> **Objetivo**: Aprender a subir y eliminar imágenes en endpoints usando un servicio de almacenamiento S3 (Cloudflare R2, AWS S3, MinIO).

---

## Tema: Servicio de Storage

### Subtopic: Usar storage_service con UploadFile

Para endpoints que manejan imágenes, usa el servicio `storage_service`:

```python
from app.core.storage import storage_service

# Subir imagen
image_url = await storage_service.upload_image(image)

# Eliminar imagen
await storage_service.delete_image(image_url)
```

### Subtopic: Validaciones automáticas

El servicio maneja automáticamente:
- Validación de tipo MIME (solo imágenes)
- Validación de tamaño (máximo 5MB)
- Generación de nombre único con UUID
- Subida a Cloudflare R2 (compatible con S3)

---

> **Siguiente**: `13-seed-data.md` — Scripts de seed data.
