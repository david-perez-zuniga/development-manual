# Backend Skill — Iron Gear Engineering Guide

This skill teaches any AI how to write backend code indistinguishable from the Iron Gear project's style. Every rule is backed by real code extracted from the actual codebase.

---

## 1. Stack Tecnológico y Configuración

### Stack Core

- **Framework Web**: FastAPI con CORS habilitado
- **ORM**: SQLAlchemy 2.0+ (`DeclarativeBase`, `Mapped[]`, `mapped_column()`) con soporte asíncrono (`create_async_engine`, `async_sessionmaker`)
- **Schemas/Validación**: Pydantic v2 (`BaseModel` con `ConfigDict(from_attributes=True)`)
- **Configuración**: Pydantic Settings v2 (`BaseSettings` + `SettingsConfigDict`)
- **Base de Datos**: PostgreSQL (producción), SQLite en RAM con aiosqlite (testing)
- **Migraciones**: Alembic
- **Testing**: pytest + pytest-asyncio + httpx.AsyncClient
- **Autenticación**: JWT + bcrypt + OAuth2PasswordBearer

### Configuración de la App (main.py)

Siempre define la app FastAPI con title, description y version. Incluye CORS y registra los routers con prefijo y tags:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import rt_product, rt_user, rt_distributor, rt_order, rt_order_item, auth, inventory, reports
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    description="Iron Gear API - Gestión de tienda de gimnasio",
    version="1.0.0"
)

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(rt_product.router, prefix="/router/rt_products", tags=["products"])
app.include_router(rt_user.router, prefix="/router/rt_users", tags=["users"])
app.include_router(rt_distributor.router, prefix="/router/rt_distributors", tags=["distributors"])
app.include_router(rt_order.router, prefix="/router/rt_orders", tags=["orders"])
app.include_router(rt_order_item.router, prefix="/router/rt_order_items", tags=["order_items"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(inventory.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
```

### Configuración con Pydantic Settings

Usa `pydantic_settings.BaseSettings` con `SettingsConfigDict(env_file=".env", extra="forbid")`. Define un singleton `settings = Settings()` al final:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str
    admin_email: str
    database_url: str
    database_ram_url: str
    model_config = SettingsConfigDict(env_file=".env", extra="forbid")
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    
    # Cloudflare R2 Configuration
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_endpoint: str = ""
    r2_bucket_name: str = "iron-gear"
    r2_public_url: str = ""


settings = Settings()


def get_settings():
    return settings
```

### Conexión a Base de Datos Asíncrona

Siempre usa `create_async_engine` + `async_sessionmaker`. La función `get_db` es un generador asíncrono que yield la sesión:

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.base import Base

SQLALCHEMY_DATABASE_URL = settings.database_url

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)


async def get_db():
    async with SessionLocal() as session:
        yield session
```

---

## 2. Arquitectura y Estructura del Proyecto

### Árbol del Proyecto

```
backend/
├── main.py                          # FastAPI app + routers
├── requirements.txt
├── .env                             # Variables de entorno
├── alembic.ini
├── alembic/                         # Migraciones
│   └── versions/
├── app/
│   ├── core/
│   │   ├── config.py                # Settings
│   │   ├── database.py              # Async engine + get_db
│   │   ├── security.py              # JWT, bcrypt
│   │   └── storage.py               # Cloudflare R2 (S3)
│   ├── models/
│   │   ├── base.py                  # DeclarativeBase
│   │   ├── md_Product.py            # Modelo + Enum
│   │   ├── md_User.py
│   │   ├── md_Order.py
│   │   ├── md_OrderItem.py
│   │   └── md_Distributor.py
│   ├── schemas/
│   │   ├── __init__.py              # BaseSchema + re-exports
│   │   ├── product_schema.py
│   │   ├── user_schema.py
│   │   ├── order_schema.py
│   │   ├── order_item_schema.py
│   │   └── distributor_schema.py
│   ├── api/
│   │   ├── deps.py                  # Dependencies (auth, roles)
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── rt_product.py
│   │       ├── rt_user.py
│   │       ├── rt_order.py
│   │       ├── rt_order_item.py
│   │       ├── rt_distributor.py
│   │       ├── auth.py
│   │       ├── inventory.py
│   │       └── reports.py
│   └── scripts/
│       └── seed.py                  # Seed data
└── tests/
    ├── pytest.ini
    ├── conftest.py
    └── test_rt_product.py
```

### Base Declarative para Modelos

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

### BaseSchema para Pydantic

Todas las schemas heredan de `BaseSchema`. Se define en `app/schemas/__init__.py` junto con re-exports de todas las schemas:

```python
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
```

Cada schema module importa `BaseSchema` desde el paquete:

```python
from . import BaseSchema
```

### Separación de Responsabilidades

| Capa | Carpeta | Prefijo Archivo | Responsabilidad |
|------|---------|-----------------|-----------------|
| Modelos | `app/models/` | `md_` | Definición de tablas SQLAlchemy + Enums |
| Schemas | `app/schemas/` | `{entity}_schema` | Validación Pydantic (Create/Read/Update) |
| Rutas | `app/api/routes/` | `rt_` | Endpoints CRUD + lógica de negocio |
| Core | `app/core/` | — | Config, DB, seguridad, storage |
| Tests | `tests/` | `test_rt_` | Pruebas por entidad |

---

## 3. Modelos SQLAlchemy

### Reglas para Definir Modelos

1. Heredan de `Base` (importado de `app.models.base`)
2. `__tablename__` en minúsculas plural
3. Usa `Mapped[]` y `mapped_column()` estrictamente
4. Define Enums en el mismo archivo del modelo (como clase `str, Enum`)
5. Usa `TYPE_CHECKING` para imports circulares en relaciones
6. Relaciones con `back_populates` (bidireccionales)
7. `cascade="all, delete-orphan"` en relaciones padre → hijo

### Plantilla Completa de Modelo (md_Product.py)

```python
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.md_Distributor import Distributor


class ProductCategory(str, Enum):
    DUMBBELLS = "mancuernas"
    MACHINES = "máquinas"
    BARS = "barras"
    CLOTHING = "ropa"
    SUPPLEMENTS = "suplementos"
    PHARMACOLOGY = "farmacología"


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

### Otro Ejemplo con Timestamps (md_Order.py)

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

### Modelo con Unique (md_Distributor.py)

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

### __init__.py de Modelos

Re-exporta todo para facilitar imports:

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

---

## 4. Schemas Pydantic

### Patrón de 4 Clases por Entidad

Siempre define estas 4 clases por cada entidad:

| Clase | Hereda de | Propósito | Tiene ID |
|-------|-----------|-----------|----------|
| `{Entity}Base` | `BaseSchema` | Campos compartidos | No |
| `{Entity}Create` | `{Entity}Base` | Creación (sin ID) | No |
| `{Entity}Update` | `BaseSchema` | Actualización (todos opcionales) | No |
| `{Entity}Read` | `{Entity}Base` | Respuesta (incluye ID) | Sí |

### Plantilla Completa de Schema (product_schema.py)

```python
from pydantic import Field

from . import BaseSchema
from .distributor_schema import DistributorRead


class ProductBase(BaseSchema):
    distributor_id: int
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
    distributor_id: int | None = None
    name: str | None = Field(default=None, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    price: float | None = None
    is_discount: bool | None = None
    stock: int | None = None
    category: str | None = Field(default=None, max_length=50)
    image_url: str | None = Field(default=None, max_length=500)


class ProductRead(ProductBase):
    id: int
    distributor: DistributorRead | None = None
```

### Schema con Validación Regex y Relaciones Anidadas (order_schema.py)

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

### Schema Update: Todos los Campos Opcionales

El `Update` schema SIEMPRE tiene todos los campos como `None | None` para permitir PATCH parcial:

```python
class DistributorUpdate(BaseSchema):
    name: str | None = Field(default=None, max_length=100)
    contact_email: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
```

### Re-exports en __init__.py de Schemas

```python
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


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

## 5. Patrones de Endpoints CRUD

### Reglas Generales de Rutas

- Variable de conexión SIEMPRE se llama `conex` (nunca `db`, `session`)
- Importa modelos con alias `tbl_`: `from app.models.md_Product import Product as tbl_Product`
- Usa `selectinload()` para eager loading de relaciones
- `response_model` siempre especificado
- POST devuelve `status_code=status.HTTP_201_CREATED`
- DELETE devuelve `status_code=status.HTTP_204_NO_CONTENT`
- try/except con 3 bloques: `HTTPException` (re-raise), `IntegrityError` (400 + rollback), `Exception` (500 + rollback)

### 5.1 — POST (Creación vía JSON Schema)

Usa este patrón cuando los datos vienen como JSON (sin archivos):

```python
@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, conex: AsyncSession = Depends(get_db)):
    try:
        user_dict = user_data.model_dump(exclude_unset=True)
        if 'password' in user_dict:
            user_dict['password_hash'] = get_password_hash(user_dict.pop('password'))
        nuevo = tbl_User(**user_dict)
        conex.add(nuevo)
        await conex.commit()
        await conex.refresh(nuevo)
        return nuevo
    except IntegrityError as e:
        print(f"Error de request: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear usuario: {str(e)}"
        )
    except Exception as e:
        print(f"Error con el server: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al crear usuario: {str(e)}"
        )
```

### 5.2 — POST (Creación vía Form/Multipart con subida de imagen)

Usa este patrón cuando el endpoint recibe archivos (multipart/form-data). Cada campo se declara individualmente con `Form(...)` o `File(None)`:

```python
@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    is_discount: bool = Form(False),
    stock: int = Form(0),
    category: str = Form(...),
    distributor_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    conex: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_seller)
):
    try:
        image_url = None
        if image:
            image_url = await storage_service.upload_image(image)
        
        product_data = {
            "name": name,
            "description": description,
            "price": price,
            "is_discount": is_discount,
            "stock": stock,
            "category": category,
            "distributor_id": distributor_id,
            "image_url": image_url
        }
        
        nuevo = tbl_Product(**product_data)
        conex.add(nuevo)
        await conex.commit()
        await conex.refresh(nuevo)
        
        # Cargar relación explícitamente después del commit
        stmt = select(tbl_Product).where(tbl_Product.id == nuevo.id).options(selectinload(tbl_Product.distributor))
        result = await conex.execute(stmt)
        nuevo = result.scalar_one()
        
        return nuevo
    except IntegrityError as e:
        print(f"Error de request: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear producto: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error con el server: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al crear producto: {str(e)}"
        )
```

### 5.3 — GET (Listado)

```python
@router.get("/", response_model=list[ProductRead])
async def get_products(conex: AsyncSession = Depends(get_db)):
    try:
        stmt = select(tbl_Product).options(selectinload(tbl_Product.distributor))
        result = await conex.execute(stmt)
        products = result.scalars().all()
        return products
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener productos: {str(e)}"
        )
```

### 5.4 — GET (Individual por ID)

Siempre verifica `scalar_one_or_none()` y lanza 404 si no existe:

```python
@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: int, conex: AsyncSession = Depends(get_db)):
    try:
        stmt = select(tbl_Product).where(tbl_Product.id == product_id).options(selectinload(tbl_Product.distributor))
        result = await conex.execute(stmt)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado"
            )
        return product
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener producto: {str(e)}"
        )
```

### 5.5 — PATCH (Actualización vía Schema)

Usa `model_dump(exclude_unset=True, exclude_none=True)` para obtener solo los campos enviados. Luego itera con `setattr`:

```python
@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    conex: AsyncSession = Depends(get_db)
):
    try:
        stmt = select(tbl_User).where(tbl_User.id == user_id)
        result = await conex.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        update_data = user_data.model_dump(exclude_unset=True, exclude_none=True)
        if not update_data:
            return user
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        await conex.commit()
        await conex.refresh(user)
        return user
    except HTTPException:
        raise
    except IntegrityError as e:
        print(f"Error de request: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar usuario: {str(e)}"
        )
    except Exception as e:
        print(f"Error con el server: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al actualizar usuario: {str(e)}"
        )
```

### 5.6 — PATCH (Actualización vía Form/Multipart)

Cada campo se verifica individualmente con `if campo is not None:`:

```python
@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    is_discount: Optional[bool] = Form(None),
    stock: Optional[int] = Form(None),
    category: Optional[str] = Form(None),
    distributor_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    delete_image: bool = Form(False),
    conex: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_seller)
):
    try:
        stmt = select(tbl_Product).where(tbl_Product.id == product_id).options(selectinload(tbl_Product.distributor))
        result = await conex.execute(stmt)
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado"
            )
        
        if name is not None:
            product.name = name
        if description is not None:
            product.description = description
        if price is not None:
            product.price = price
        if is_discount is not None:
            product.is_discount = is_discount
        if stock is not None:
            product.stock = stock
        if category is not None:
            product.category = category
        if distributor_id is not None:
            product.distributor_id = distributor_id
        
        if delete_image and product.image_url:
            await storage_service.delete_image(product.image_url)
            product.image_url = None
        
        if image:
            if product.image_url:
                await storage_service.delete_image(product.image_url)
            image_url = await storage_service.upload_image(image)
            product.image_url = image_url
        
        await conex.commit()
        await conex.refresh(product)
        return product
    except HTTPException:
        raise
    except IntegrityError as e:
        print(f"Error de request: {e}")
        await conex.rollback()
        raise HTTPException(...)
    except Exception as e:
        print(f"Error con el server: {e}")
        await conex.rollback()
        raise HTTPException(...)
```

### 5.7 — DELETE

Siempre retorna `status_code=status.HTTP_204_NO_CONTENT` y `return None`:

```python
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    conex: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_seller)
):
    try:
        stmt = select(tbl_Product).where(tbl_Product.id == product_id)
        result = await conex.execute(stmt)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado"
            )
        
        await conex.delete(product)
        await conex.commit()
        return None
    except HTTPException:
        raise
    except IntegrityError as e:
        print(f"Error de request: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al eliminar producto: {str(e)}"
        )
    except Exception as e:
        print(f"Error con el server: {e}")
        await conex.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al eliminar producto: {str(e)}"
        )
```

---

## 6. Convenciones de Nombrado y Tipado Estricto

### Prefijos de Archivos

| Tipo | Prefijo | Ejemplo |
|------|---------|---------|
| Rutas | `rt_` | `rt_product.py`, `rt_user.py`, `rt_order.py` |
| Modelos | `md_` | `md_Product.py`, `md_User.py`, `md_Order.py` |
| Schemas | `{entidad}_schema` | `product_schema.py`, `user_schema.py` |
| Tests | `test_rt_` | `test_rt_product.py` |

### Alias de Import en Rutas

```python
# Modelo → alias tbl_
from app.models.md_Product import Product as tbl_Product
from app.models.md_User import User as tbl_User
from app.models.md_Order import Order as tbl_Order

# Schema → sin alias (se usa el nombre de clase)
from app.schemas.product_schema import ProductCreate, ProductRead, ProductUpdate
```

### Type Hinting Estricto

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

### Nombres de Variables

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

### Enums

Siempre como `class <Nombre>(str, Enum)` con valores en español:

```python
class ProductCategory(str, Enum):
    DUMBBELLS = "mancuernas"
    MACHINES = "máquinas"
    BARS = "barras"
    CLOTHING = "ropa"
    SUPPLEMENTS = "suplementos"
    PHARMACOLOGY = "farmacología"


class UserRole(str, Enum):
    ADMIN = "administrador"
    SELLER = "vendedor"
    CLIENT = "cliente"


class OrderStatus(str, Enum):
    PENDING = "pendiente"
    SHIPPED = "enviado"
    DELIVERED = "entregado"
```

---

## 7. Manejo de Errores y Validaciones

### Estructura de try/except

Siempre usa TRES bloques en este orden:

```python
try:
    # Lógica principal
    ...

except HTTPException:
    # Re-lanzar excepciones HTTP ya construidas
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

### Códigos de Estado HTTP

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

### Manejo de No Encontrado

```python
result = await conex.execute(stmt)
entidad = result.scalar_one_or_none()
if not entidad:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Entidad no encontrada"
    )
```

### Manejo de IntegrityError

Siempre hacer `await conex.rollback()` antes de lanzar la excepción HTTP:

```python
except IntegrityError as e:
    print(f"Error de request: {e}")
    await conex.rollback()
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Error al crear entidad: {str(e)}"
    )
```

### Logging en Desarrollo

Usa `print()` simple para logging en desarrollo:

```python
print(f"Error: {e}")
print(f"Error con el server: {e}")
print(f"Error de request: {e}")
```

---

## 8. Estrategia de Testing

### Configuración de pytest.ini

```ini
[pytest]
pythonpath = .
env_files = .env
asyncio_mode = auto
```

### conftest.py — Base de Datos en RAM

Siempre usa SQLite en RAM (`aiosqlite`) para tests. La URL viene de `settings.database_ram_url`:

```python
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import main as app_module
from main import app
from app.core.database import get_db, Base
from app.core.config import settings
from app.api.deps import get_current_seller
from app.models.md_User import User
from app.models.md_Distributor import Distributor
from app.core.security import get_password_hash


SQLALCHEMY_DATABASE_URL = settings.database_ram_url

engine_test = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine_test,
    class_=AsyncSession
)
```

### Fixture setup_database (autouse)

Crea y destruye tablas automáticamente para cada sesión de test:

```python
@pytest.fixture(autouse=True)
async def setup_database():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Crear datos de prueba (usuario y distribuidor)
    async with TestingSessionLocal() as session:
        test_user = User(
            name="Test Seller",
            email="test@seller.com",
            password_hash=get_password_hash("testpass123"),
            role="vendedor"
        )
        session.add(test_user)
        
        test_distributor = Distributor(
            name="Test Distributor",
            contact_email="test@distributor.com",
            phone="1234567890",
            address="Test Address",
            is_active=True
        )
        session.add(test_distributor)
        
        await session.commit()
    
    yield
    
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

### Dependency Overrides

Reemplaza las dependencias reales por las de test:

```python
async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


async def override_get_current_seller():
    async with TestingSessionLocal() as session:
        from sqlalchemy import select
        stmt = select(User).where(User.email == "test@seller.com")
        result = await session.execute(stmt)
        test_user = result.scalar_one_or_none()
        return test_user


@pytest.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_seller] = override_get_current_seller
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_distributor():
    """Get the test distributor from database."""
    async with TestingSessionLocal() as session:
        from sqlalchemy import select
        stmt = select(Distributor).where(Distributor.name == "Test Distributor")
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
```

### Test Completo de CRUD (test_rt_product.py)

Siempre usa `@pytest.mark.asyncio`, `client: AsyncClient`, y `test_distributor` fixture. Sigue el patrón Arrange → Act → Assert:

```python
import pytest
from httpx import AsyncClient


# ============== CREATE ==============

@pytest.mark.asyncio
async def test_create_product_success(client: AsyncClient, test_distributor):
    """Test creating a product successfully."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "mancuernas",
        "distributor_id": str(test_distributor.id)
    }
    
    response = await client.post("/router/rt_products/", data=product_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["description"] == "Test description"
    assert float(data["price"]) == 99.99
    assert data["stock"] == 10
    assert data["category"] == "mancuernas"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_product_missing_required_fields(client: AsyncClient, test_distributor):
    """Test creating product without required fields."""
    product_data = {
        "name": "Test Product",
        "price": "99.99"
    }
    
    response = await client.post("/router/rt_products/", data=product_data)
    
    assert response.status_code == 422


# ============== GET (LIST) ==============

@pytest.mark.asyncio
async def test_get_products_success(client: AsyncClient, test_distributor):
    """Test getting all products."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "mancuernas",
        "distributor_id": str(test_distributor.id)
    }
    await client.post("/router/rt_products/", data=product_data)
    
    response = await client.get("/router/rt_products/")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_products_empty(client: AsyncClient):
    """Test getting products when none exist."""
    response = await client.get("/router/rt_products/")
    
    assert response.status_code == 200
    data = response.json()
    assert data == []


# ============== GET (SINGLE) ==============

@pytest.mark.asyncio
async def test_get_product_success(client: AsyncClient, test_distributor):
    """Test getting a single product by ID."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "mancuernas",
        "distributor_id": str(test_distributor.id)
    }
    create_response = await client.post("/router/rt_products/", data=product_data)
    product_id = create_response.json()["id"]
    
    response = await client.get(f"/router/rt_products/{product_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["id"] == product_id


@pytest.mark.asyncio
async def test_get_product_not_found(client: AsyncClient):
    """Test getting a non-existent product."""
    response = await client.get("/router/rt_products/999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Producto no encontrado"


# ============== PATCH ==============

@pytest.mark.asyncio
async def test_update_product_success(client: AsyncClient, test_distributor):
    """Test updating a product successfully."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "mancuernas",
        "distributor_id": str(test_distributor.id)
    }
    create_response = await client.post("/router/rt_products/", data=product_data)
    product_id = create_response.json()["id"]
    
    update_data = {
        "name": "Updated Product",
        "price": "149.99"
    }
    
    response = await client.patch(f"/router/rt_products/{product_id}", data=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Product"
    assert float(data["price"]) == 149.99


@pytest.mark.asyncio
async def test_update_product_not_found(client: AsyncClient):
    """Test updating a non-existent product."""
    update_data = {"name": "Updated Product"}
    
    response = await client.patch("/router/rt_products/999", data=update_data)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Producto no encontrado"


@pytest.mark.asyncio
async def test_update_product_partial(client: AsyncClient, test_distributor):
    """Test partially updating a product."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "mancuernas",
        "distributor_id": str(test_distributor.id)
    }
    create_response = await client.post("/router/rt_products/", data=product_data)
    product_id = create_response.json()["id"]
    
    update_data = {"name": "New Name"}
    
    response = await client.patch(f"/router/rt_products/{product_id}", data=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Test description"


# ============== DELETE ==============

@pytest.mark.asyncio
async def test_delete_product_success(client: AsyncClient, test_distributor):
    """Test deleting a product successfully."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "mancuernas",
        "distributor_id": str(test_distributor.id)
    }
    create_response = await client.post("/router/rt_products/", data=product_data)
    product_id = create_response.json()["id"]
    
    response = await client.delete(f"/router/rt_products/{product_id}")
    
    assert response.status_code == 204
    
    get_response = await client.get(f"/router/rt_products/{product_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_product_not_found(client: AsyncClient):
    """Test deleting a non-existent product."""
    response = await client.delete("/router/rt_products/999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Producto no encontrado"
```

---

## 9. Seguridad y Autenticación

### Dependencias de Seguridad (app/api/deps.py)

Siempre define estas dependencias en orden de restricción creciente:

```python
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.md_User import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db)
) -> User:
    token_data = decode_access_token(token)

    stmt = select(User).where(User.id == token_data.user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def require_role(allowed_roles: list[str]) -> Callable:
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


async def get_current_seller(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in ["administrador", "vendedor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller privileges required"
        )
    return current_user
```

### JWT + bcrypt (app/core/security.py)

```python
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from pydantic import BaseModel

from app.core.config import settings


class TokenData(BaseModel):
    user_id: int
    email: str
    role: str


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> TokenData:
    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm]
    )
    sub = payload.get("sub")
    if sub is None:
        raise ValueError("Token missing 'sub' field")
    return TokenData(
        user_id=int(sub),
        email=payload.get("email"),
        role=payload.get("role")
    )
```

### Endpoint de Login

```python
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.md_User import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == form_data.username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }
```

### Uso en Rutas Protegidas

```python
# Ruta accesible solo para administradores
from app.api.deps import get_current_admin

@router.get("/reports/top-products")
async def get_top_products(
    conex: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    ...

# Ruta accesible para admin y vendedores
from app.api.deps import get_current_seller

@router.post("/")
async def create_product(
    ...,
    current_user: User = Depends(get_current_seller)
):
    ...

# Ruta con roles dinámicos
from app.api.deps import require_role
from app.models.md_User import UserRole

@router.post("/checkout")
async def checkout_order(
    ...,
    current_user: User = Depends(require_role([UserRole.CLIENT.value]))
):
    ...
```

---

## 10. Reglas Imperativas (Resumen)

1. **Siempre separa modelos de schemas**: modelos en `app/models/md_*.py`, schemas en `app/schemas/*_schema.py`
2. **Usa sesiones asíncronas**: `AsyncSession`, `await`, `async with`
3. **Nombra archivos de rutas con prefijo `rt_`**: `rt_product.py`, `rt_user.py`
4. **Nombra archivos de modelos con prefijo `md_`**: `md_Product.py`, `md_User.py`
5. **Nombra archivos de schemas con sufijo `_schema`**: `product_schema.py`, `user_schema.py`
6. **Importa modelos con alias `tbl_`**: `from app.models.md_Product import Product as tbl_Product`
7. **Usa `TYPE_CHECKING` para imports circulares** en relaciones
8. **Usa Pydantic para validación** — no escribas validación manual
9. **Nombre de variable de conexión: `conex`** — no `db`, no `session`
10. **Todas las funciones de endpoint son `async`**
11. **Siempre haz `await conex.rollback()` en bloques `except`**
12. **Logging en desarrollo con `print(f"Error: {e}")`**
13. **Registra routers con `prefix` y `tags`**: `app.include_router(router, prefix="/router/rt_products", tags=["products"])`
14. **Define `response_model` en todos los endpoints**
15. **POST retorna `status_code=status.HTTP_201_CREATED`**
16. **DELETE retorna `status_code=status.HTTP_204_NO_CONTENT`**
17. **Update schemas tienen todos los campos como `None | None = None`** para permitir PATCH parcial
18. **Usa `model_dump(exclude_unset=True, exclude_none=True)` en PATCH con schema**
19. **Usa `selectinload()` para eager loading de relaciones**
20. **Relaciones con `cascade="all, delete-orphan"` en el lado padre**
21. **Base de datos de test en RAM con aiosqlite** — nunca PostgreSQL en tests
22. **Fixture `setup_database` con `autouse=True`** para crear/drop tablas automáticamente
23. **Usa `httpx.AsyncClient` con `ASGITransport`** para testear la API
24. **Usa `app.dependency_overrides`** para mockear dependencias en tests
25. **Siempre verifica `scalar_one_or_none()`** y lanza 404 si es `None`
26. **Usa `DeclarativeBase`** (no `declarative_base()`)
27. **Define Enums como `class <Name>(str, Enum)`** con valores en español
28. **Usa `SettingsConfigDict(env_file=".env", extra="forbid")`** en config
29. **Comentarios de lógica en español** cuando sean necesarios
30. **pytest.ini con `asyncio_mode = auto`** para no tener que marcar cada test con `@pytest.mark.asyncio` (aunque por claridad se sigue usando)

---

## 11. Enums y Constantes

Define siempre los Enums dentro del mismo archivo del modelo que los usa:

```python
# md_Product.py
class ProductCategory(str, Enum):
    DUMBBELLS = "mancuernas"
    MACHINES = "máquinas"
    BARS = "barras"
    CLOTHING = "ropa"
    SUPPLEMENTS = "suplementos"
    PHARMACOLOGY = "farmacología"

# md_User.py
class UserRole(str, Enum):
    ADMIN = "administrador"
    SELLER = "vendedor"
    CLIENT = "cliente"

# md_Order.py
class OrderStatus(str, Enum):
    PENDING = "pendiente"
    SHIPPED = "enviado"
    DELIVERED = "entregado"
```

Re-exporta los Enums desde `app/models/__init__.py` para que sean accesibles desde cualquier parte del proyecto:

```python
from app.models.md_User import User, UserRole
from app.models.md_Order import Order, OrderStatus
```

---

## 12. Queries y Eager Loading

### Query Básica

```python
from sqlalchemy import select

stmt = select(tbl_Product).where(tbl_Product.id == product_id)
result = await conex.execute(stmt)
product = result.scalar_one_or_none()
```

### Eager Loading con selectinload

```python
from sqlalchemy.orm import selectinload, joinedload

# Carga una relación directa
stmt = select(tbl_Product).options(selectinload(tbl_Product.distributor))

# Carga relaciones anidadas
stmt = select(tbl_Order).options(
    selectinload(tbl_Order.user),
    selectinload(tbl_Order.items).joinedload(tbl_OrderItem.product).joinedload(tbl_Product.distributor)
)
```

### Agregaciones

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

---

## 13. Almacenamiento de Archivos (Cloudflare R2)

Para endpoints que manejan imágenes, usa el servicio `storage_service` con `UploadFile`:

```python
from app.core.storage import storage_service

# Subir imagen
image_url = await storage_service.upload_image(image)

# Eliminar imagen
await storage_service.delete_image(image_url)
```

El servicio maneja automáticamente:
- Validación de tipo MIME (solo imágenes)
- Validación de tamaño (máximo 5MB)
- Generación de nombre único con UUID
- Subida a Cloudflare R2 (compatible con S3)

---

## 14. Seed Data

Para scripts de seed, usa el mismo patrón asíncrono con verificación de existencia previa:

```python
async def seed_users(conex: AsyncSession):
    users_data = [
        {
            "name": "Admin Principal",
            "email": "admin@irongear.com",
            "password": "admin123",
            "role": UserRole.ADMIN.value
        },
    ]
    
    for user_data in users_data:
        stmt = select(User).where(User.email == user_data["email"])
        result = await conex.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"Usuario {user_data['email']} ya existe, saltando...")
            continue
        
        password_hash = await hash_password(user_data["password"])
        
        nuevo = User(
            name=user_data["name"],
            email=user_data["email"],
            password_hash=password_hash,
            role=user_data["role"]
        )
        conex.add(nuevo)
        print(f"Usuario {user_data['email']} creado")
    
    await conex.commit()
```

Ejecución desde `__main__`:

```python
async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with SessionLocal() as conex:
        try:
            await seed_users(conex)
            await seed_distributors(conex)
            await seed_products(conex)
        except Exception as e:
            await conex.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 15. Checklist de Implementación

Al crear un nuevo módulo (ej. nueva entidad "Category"), sigue estos pasos:

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
