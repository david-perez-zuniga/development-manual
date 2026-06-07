# 04 — Modelos SQLAlchemy

> **Objetivo**: Aprender a definir modelos de base de datos usando SQLAlchemy 2.0+ con tipado estricto (`Mapped[]`, `mapped_column()`).

---

## Tema: Reglas para Definir Modelos

### Subtopic: Reglas generales

1. Heredan de `Base` (importado de `app.models.base`)
2. `__tablename__` en minúsculas plural
3. Usa `Mapped[]` y `mapped_column()` estrictamente (nuevo estilo SQLAlchemy 2.0)
4. Define Enums en el mismo archivo del modelo (como clase `str, Enum`)
5. Usa `TYPE_CHECKING` para imports circulares en relaciones
6. Relaciones con `back_populates` (bidireccionales)
7. `cascade="all, delete-orphan"` en relaciones padre → hijo

---

## Tema: Modelo Básico

### Subtopic: Product — modelo con categoría enum y FK

```python
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.md_Distributor import Distributor


class ProductCategory(str, Enum):
    ELECTRONICS = "electrónica"
    CLOTHING = "ropa"
    FOOD = "alimentos"
    BOOKS = "libros"
    SPORTS = "deportes"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    distributor_id: Mapped[int] = mapped_column(ForeignKey("distributors.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_discount: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    stock: Mapped[int] = mapped_column(default=0, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)

    distributor: Mapped["Distributor"] = relationship(back_populates="products")
```

> **Aprende**: `Mapped[type]` es la nueva forma de declarar columnas en SQLAlchemy 2.0. Cada columna combina el tipo Python con `mapped_column()` para configuración SQL. `Numeric(10, 2)` es un decimal con 10 dígitos totales y 2 decimales — ideal para precios.

---

## Tema: Modelo con Timestamps

### Subtopic: Order — modelo con created_at y updated_at

```python
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.md_User import User
    from app.models.md_OrderItem import OrderItem


class OrderStatus(str, Enum):
    PENDING = "pendiente"
    SHIPPED = "enviado"
    DELIVERED = "entregado"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=OrderStatus.PENDING.value)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
```

> **Aprende**: `onupdate=datetime.utcnow` actualiza automáticamente el timestamp cada vez que se modifica el registro. `cascade="all, delete-orphan"` significa que cuando se elimina una orden, todos sus items se eliminan automáticamente.

---

## Tema: Modelo con Unique

### Subtopic: Distributor — modelo con campo unique

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Distributor(Base):
    __tablename__ = "distributors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    contact_email: Mapped[str] = mapped_column(String(100), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    products: Mapped[list["Product"]] = relationship(back_populates="distributor", cascade="all, delete-orphan")
```

> **Aprende**: `unique=True` crea una restricción de unicidad en la BD. Si intentas insertar un nombre duplicado, SQLAlchemy lanzará un `IntegrityError`.

---

## Tema: Re-exports de Modelos

### Subtopic: Centralizar imports en `__init__.py`

```python
from app.models.base import Base
from app.models.md_Distributor import Distributor
from app.models.md_Order import Order, OrderStatus
from app.models.md_OrderItem import OrderItem
from app.models.md_Product import Product, ProductCategory
from app.models.md_User import User, UserRole

__all__ = [
    "Base",
    "Distributor",
    "Order",
    "OrderItem",
    "OrderStatus",
    "Product",
    "ProductCategory",
    "User",
    "UserRole",
]
```

> **Aprende**: Centralizar imports permite importar cualquier modelo desde un solo lugar: `from app.models import Product, User`. El `__all__` explicita qué está disponible, útil para herramientas de análisis estático.

---

> **Siguiente**: `05-schemas-pydantic.md` — Aprende a definir schemas de validación con Pydantic.
