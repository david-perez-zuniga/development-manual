# 08 — Manejo de Errores y Validaciones

> **Objetivo**: Aprender la estructura de manejo de errores en endpoints, los códigos HTTP y cómo hacer rollback de transacciones.

---

## Tema: Estructura de try/except

### Subtopic: Los 3 bloques de captura

Siempre usa TRES bloques en este orden específico:

```python
try:
    # Lógica principal
    ...

except HTTPException:
    # Re-lanzar excepciones HTTP ya construidas (como 404)
    raise

except IntegrityError as e:
    # Error de integridad (FK duplicado, unique constraint, etc.)
    print(f"Error de request: {e}")
    await conex.rollback()
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Error al crear entidad: {str(e)}"
    )

except Exception as e:
    # Cualquier otro error inesperado
    print(f"Error con el server: {e}")
    await conex.rollback()
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Error inesperado al crear entidad: {str(e)}"
    )
```

> **Aprende**: El orden es importante. `HTTPException` se captura primero y se relanza para que FastAPI la maneje. `IntegrityError` es específico de SQLAlchemy y siempre requiere rollback. `Exception` es el catch-all final.

---

## Tema: Códigos de Estado HTTP

### Subtopic: Cuándo usar cada código

| Código | Constante | Uso |
|--------|-----------|-----|
| 200 | `status.HTTP_200_OK` | Éxito GET/PATCH |
| 201 | `status.HTTP_201_CREATED` | Éxito POST |
| 204 | `status.HTTP_204_NO_CONTENT` | Éxito DELETE |
| 400 | `status.HTTP_400_BAD_REQUEST` | Error de negocio, datos inválidos, IntegrityError |
| 401 | `status.HTTP_401_UNAUTHORIZED` | Credenciales inválidas |
| 403 | `status.HTTP_403_FORBIDDEN` | Permisos insuficientes |
| 404 | `status.HTTP_404_NOT_FOUND` | Recurso no encontrado |
| 422 | (automático de Pydantic) | Validación de schema fallida |
| 500 | `status.HTTP_500_INTERNAL_SERVER_ERROR` | Error inesperado del servidor |

---

## Tema: Manejo de No Encontrado (404)

### Subtopic: Patrón scalar_one_or_none

```python
result = await conex.execute(stmt)
entidad = result.scalar_one_or_none()
if not entidad:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Entidad no encontrada"
    )
```

> **Aprende**: `scalar_one_or_none()` es el método estándar para búsquedas por ID o filtros únicos. Si esperas múltiples resultados, usa `scalars().all()`.

---

## Tema: Manejo de IntegrityError

### Subtopic: Rollback obligatorio antes de responder

```python
except IntegrityError as e:
    print(f"Error de request: {e}")
    await conex.rollback()
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Error al crear entidad: {str(e)}"
    )
```

> **Aprende**: Siempre haz `await conex.rollback()` antes de lanzar la excepción HTTP. Si no haces rollback, la sesión queda en estado "muerto" y no puede reutilizarse. El 400 indica que fue un error del cliente (datos duplicados, FK inválida, etc.).

---

## Tema: Logging en Desarrollo

### Subtopic: Usar print() para desarrollo

```python
print(f"Error: {e}")
print(f"Error con el server: {e}")
print(f"Error de request: {e}")
```

> **Aprende**: En desarrollo, `print()` es suficiente. Para producción, deberías usar `logging` o un servicio como Sentry. La idea es que los errores sean visibles en la terminal mientras desarrollas.

---

> **Siguiente**: `09-testing.md` — Estrategia de testing con pytest y httpx.
