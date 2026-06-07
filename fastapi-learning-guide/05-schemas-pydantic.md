# 05 — Schemas Pydantic

> **Objetivo**: Aprender a definir schemas de validación con Pydantic v2 siguiendo el patrón de 4 clases por entidad.

---

## Tema: Patrón de 4 Clases por Entidad

### Subtopic: Estructura de schemas

Siempre define estas 4 clases por cada entidad:

| Clase | Hereda de | Propósito | Tiene ID |
|-------|-----------|-----------|----------|
| `{Entity}Base` | `BaseSchema` | Campos compartidos | No |
| `{Entity}Create` | `{Entity}Base` | Creación (sin ID) | No |
| `{Entity}Update` | `BaseSchema` | Actualización (todos opcionales) | No |
| `{Entity}Read` | `{Entity}Base` | Respuesta (incluye ID) | Sí |

### Subtopic: Schema básico

```python
from pydantic import Field

from . import BaseSchema


class ProductBase(BaseSchema):
    name: str = Field(max_length=150)
    description: str | None = Field(default=None, max_length=500)
    price: float
    is_discount: bool = False
    stock: int = 0
    category: str = Field(max_length=50)
    image_url: str | None = Field(default=None, max_length=500)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseSchema):
    name: str | None = Field(default=None, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    price: float | None = None
    is_discount: bool | None = None
    stock: int | None = None
    category: str | None = Field(default=None, max_length=50)
    image_url: str | None = Field(default=None, max_length=500)


class ProductRead(ProductBase):
    id: int
```

> **Aprende**: `ProductBase` define los campos comunes. `ProductCreate` hereda todo (no agrega nada). `ProductUpdate` tiene TODOS los campos como `None | None` para permitir PATCH parcial. `ProductRead` agrega el `id` que viene de la BD.

---

## Tema: Schema con Validación Avanzada

### Subtopic: Order — validación regex, relaciones anidadas y listas

```python
from pydantic import Field
from . import BaseSchema
from .user_schema import UserRead
from .order_item_schema import OrderItemRead, OrderItemCheckoutRead
from datetime import datetime


class OrderBase(BaseSchema):
    user_id: int
    status: str = "pendiente"
    total_amount: float = 0


class OrderCreate(OrderBase):
    pass


class OrderItemRequest(BaseSchema):
    product_id: int
    quantity: int = Field(gt=0)


class OrderCheckoutRequest(BaseSchema):
    items: list[OrderItemRequest] = Field(min_length=1)


class OrderUpdate(BaseSchema):
    user_id: int | None = None
    status: str | None = None
    total_amount: float | None = None


class OrderRead(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    user: UserRead | None = None
    items: list[OrderItemRead] = []


class PaymentRequest(BaseSchema):
    payment_method: str = Field(pattern="^(paypal|tarjeta)$")
    transaction_id: str = Field(min_length=1, max_length=100)
```

> **Aprende**: `Field(gt=0)` valida que `quantity` sea mayor a 0. `Field(min_length=1)` valida que la lista tenga al menos 1 elemento. `Field(pattern="...")` valida con expresión regular. Las relaciones anidadas como `user: UserRead` permiten serializar objetos completos en la respuesta.

---

## Tema: Schema Update con Todos los Campos Opcionales

### Subtopic: Permitir PATCH parcial

El `Update` schema SIEMPRE tiene todos los campos como `None | None` para permitir actualizaciones parciales:

```python
from pydantic import Field
from . import BaseSchema


class DistributorUpdate(BaseSchema):
    name: str | None = Field(default=None, max_length=100)
    contact_email: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
```

> **Aprende**: En el endpoint PATCH, usamos `model_dump(exclude_unset=True, exclude_none=True)` para obtener solo los campos que el cliente envió. Esto permite actualizar solo un campo sin tener que enviar todo el objeto.

---

## Tema: BaseSchema y Re-exports

### Subtopic: Crear BaseSchema

```python
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
```

### Subtopic: Re-exports en `__init__.py`

```python
from .distributor_schema import (
    DistributorCreate,
    DistributorRead,
    DistributorUpdate,
)
from .product_schema import (
    ProductCreate,
    ProductRead,
    ProductUpdate,
)
# ... etc

__all__ = [
    "BaseSchema",
    "DistributorCreate",
    "DistributorRead",
    "DistributorUpdate",
    "ProductCreate",
    "ProductRead",
    "ProductUpdate",
    # ... etc
]
```

---

> **Siguiente**: `06-endpoints-crud.md` — Aprende los patrones de endpoints CRUD.
