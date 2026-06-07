# 14 — Checklist de Implementación

> **Objetivo**: Tener una guía paso a paso para implementar un nuevo módulo completo (modelo, schema, rutas, tests, seed).

---

## Tema: Pasos para Crear un Nuevo Módulo

### Subtopic: Ejemplo: nueva entidad "Category"

- [ ] Crear `app/models/md_Category.py` con `Base`, `Mapped[]`, `__tablename__`
- [ ] Si aplica, definir Enum en el mismo archivo
- [ ] Si tiene relaciones, usar `TYPE_CHECKING` y `back_populates`
- [ ] Agregar `from app.models.md_Category import Category` en `app/models/__init__.py`
- [ ] Crear `app/schemas/category_schema.py` con `CategoryBase`, `CategoryCreate`, `CategoryUpdate`, `CategoryRead`
- [ ] Agregar re-exports en `app/schemas/__init__.py`
- [ ] Crear `app/api/routes/rt_category.py` con `APIRouter()` y CRUD completo
- [ ] Registrar en `main.py`: `app.include_router(rt_category.router, prefix="/router/rt_categories", tags=["categories"])`
- [ ] Agregar protección con `Depends(get_current_seller)` o `Depends(get_current_admin)` donde corresponda
- [ ] Crear migración Alembic: `alembic revision --autogenerate -m "add category"`
- [ ] Crear `tests/test_rt_category.py` con tests para cada operación CRUD
- [ ] Si aplica, agregar seed data en `app/scripts/seed.py`

---

> **Siguiente**: `15-enums-reference.md` — Referencia de todos los Enums.
