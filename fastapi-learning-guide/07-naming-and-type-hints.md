# 07 — Convenciones de Nombrado y Tipado Estricto

> **Objetivo**: Aprender las convenciones de nombres, prefijos de archivos y reglas de tipado que hacen el código consistente y mantenible.

---

## Tema: Prefijos de Archivos

### Subtopic: Identificar cada capa por su prefijo

| Tipo | Prefijo | Ejemplo |
|------|---------|---------|
| Rutas | `rt_` | `rt_product.py`, `rt_user.py`, `rt_order.py` |
| Modelos | `md_` | `md_Product.py`, `md_User.py`, `md_Order.py` |
| Schemas | `{entidad}_schema` | `product_schema.py`, `user_schema.py` |
| Tests | `test_rt_` | `test_rt_product.py` |

---

## Tema: Alias de Import

### Subtopic: Modelos → alias `tbl_`, Schemas → sin alias

```python
# Modelo → alias tbl_
from app.models.md_Product import Product as tbl_Product
from app.models.md_User import User as tbl_User
from app.models.md_Order import Order as tbl_Order

# Schema → sin alias (se usa el nombre de clase directamente)
from app.schemas.product_schema import ProductCreate, ProductRead, ProductUpdate
```

> **Aprende**: El prefijo `tbl_` distingue visualmente los modelos SQLAlchemy de las schemas Pydantic. Como ambos suelen tener nombres similares (`Product` el modelo, `ProductRead` el schema), el alias evita confusión.

---

## Tema: Type Hinting Estricto

### Subtopic: Tipar cada capa correctamente

```python
# SQLAlchemy — usar Mapped[] SIEMPRE
id: Mapped[int] = mapped_column(primary_key=True)
name: Mapped[str] = mapped_column(String(150), nullable=False)
price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
is_discount: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

# Pydantic — usar | None (Union syntax) y Field()
name: str = Field(max_length=150)
description: str | None = Field(default=None, max_length=500)

# FastAPI — tipar params de ruta y query
async def get_product(product_id: int, conex: AsyncSession = Depends(get_db)):

# Todos los endpoints son async
async def create_product(...):
```

> **Aprende**: Python 3.10+ permite `str | None` en vez de `Optional[str]`. Esta sintaxis es más limpia y es la recomendada por Pydantic v2 y FastAPI.

---

## Tema: Nombres de Variables

### Subtopic: Convenciones para nombrar variables

```python
conex                     # Sesión de BD (nunca db, nunca session)
nuevo                     # Instancia creada (nuevo registro)
product / user / order    # Instancia recuperada de BD
tbl_Product               # Alias del modelo SQLAlchemy
ProductCreate             # Schema de creación
ProductRead               # Schema de respuesta
ProductUpdate             # Schema de actualización
stmt                      # Statement SQLAlchemy
```

> **Aprende**: La variable `conex` es una convención del proyecto. En otros proyectos verás `db` o `session`. La clave es la consistencia interna: elige una convención y úsala siempre.

---

> **Siguiente**: `08-error-handling.md` — Manejo de errores y validaciones.
