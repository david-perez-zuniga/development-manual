# 15 — Enums de Referencia

> **Objetivo**: Tener una referencia rápida de todos los Enums usados en los modelos.

---

## Tema: Enums por Entidad

### Subtopic: ProductCategory

Define las categorías de productos.

```python
class ProductCategory(str, Enum):
    ELECTRONICS = "electrónica"
    CLOTHING = "ropa"
    FOOD = "alimentos"
    BOOKS = "libros"
    SPORTS = "deportes"
```

### Subtopic: UserRole

Define los roles de usuario en el sistema.

```python
class UserRole(str, Enum):
    ADMIN = "administrador"
    SELLER = "vendedor"
    CLIENT = "cliente"
```

### Subtopic: OrderStatus

Define los estados posibles de una orden.

```python
class OrderStatus(str, Enum):
    PENDING = "pendiente"
    SHIPPED = "enviado"
    DELIVERED = "entregado"
```

---

## Tema: Reglas para Definir Enums

### Subtopic: Siempre como clase str + Enum

```python
class MiEnum(str, Enum):
    VALOR_1 = "valor en español"
    VALOR_2 = "otro valor"
```

### Subtopic: Ubicación

Define los Enums dentro del mismo archivo del modelo que los usa:

- `ProductCategory` → `md_Product.py`
- `UserRole` → `md_User.py`
- `OrderStatus` → `md_Order.py`

### Subtopic: Re-exportar

Re-exporta los Enums desde `app/models/__init__.py`:

```python
from app.models.md_User import User, UserRole
from app.models.md_Order import Order, OrderStatus
```

> **Aprende**: Los Enums se definen como `str, Enum` para que los valores sean strings en la BD y en los schemas JSON. Los valores están en español porque representan datos de negocio.

---

## Resumen del Stack Completo

| Componente | Librería | Propósito |
|------------|----------|-----------|
| Web Framework | FastAPI | API REST |
| ORM | SQLAlchemy 2.0+ | Base de datos |
| Validación | Pydantic v2 | Schemas |
| Configuración | Pydantic Settings | Variables de entorno |
| Auth | python-jose + bcrypt | JWT + hash |
| Testing | pytest + httpx | Tests |
| Migraciones | Alembic | Control de versiones BD |
| Storage | boto3 (S3) | Archivos |

---

> **Fin de la guía**. Vuelve a `01-project-architecture.md` si necesitas configurar un nuevo entorno desde cero.
