# 11 — Queries y Eager Loading

> **Objetivo**: Aprender a hacer consultas con SQLAlchemy asíncrono, cargar relaciones con eager loading y escribir agregaciones.

---

## Tema: Query Básica

### Subtopic: SELECT con WHERE

```python
from sqlalchemy import select

stmt = select(tbl_Product).where(tbl_Product.id == product_id)
result = await conex.execute(stmt)
product = result.scalar_one_or_none()
```

> **Aprende**: `select()` es la función principal de SQLAlchemy para crear consultas. `execute()` ejecuta la consulta en la sesión asíncrona. `scalar_one_or_none()` retorna un objeto o `None`.

---

## Tema: Eager Loading

### Subtopic: selectinload para cargar relaciones

```python
from sqlalchemy.orm import selectinload, joinedload

# Carga una relación directa
stmt = select(tbl_Product).options(selectinload(tbl_Product.distributor))

# Carga relaciones anidadas (order → items → product → distributor)
stmt = select(tbl_Order).options(
    selectinload(tbl_Order.user),
    selectinload(tbl_Order.items).joinedload(tbl_OrderItem.product).joinedload(tbl_Product.distributor)
)
```

> **Aprende**: `selectinload()` es la estrategia recomendada para la mayoría de casos. Ejecuta una consulta adicional separada para cargar la relación. `joinedload()` usa JOIN de SQL. La combinación permite cargar árboles profundos de relaciones.

---

## Tema: Agregaciones

### Subtopic: SUM, GROUP BY, ORDER BY, LIMIT

```python
from sqlalchemy import select, func

stmt = (
    select(
        OrderItem.product_id,
        Product.name,
        func.sum(OrderItem.quantity).label("total_sold")
    )
    .join(Product, OrderItem.product_id == Product.id)
    .group_by(OrderItem.product_id, Product.name)
    .order_by(func.sum(OrderItem.quantity).desc())
    .limit(5)
)
result = await conex.execute(stmt)
rows = result.all()
```

> **Aprende**: `func.sum()` es la función de agregación de SQLAlchemy. `label("total_sold")` asigna un nombre a la columna calculada. `.all()` retorna una lista de filas (tuplas), no objetos del modelo.

---

> **Siguiente**: `12-file-storage.md` — Almacenamiento de archivos con Cloudflare R2.
