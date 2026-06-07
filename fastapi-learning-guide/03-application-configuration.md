# 03 — Configuración de la Aplicación

> **Objetivo**: Aprender a configurar la aplicación FastAPI, manejar variables de entorno con Pydantic Settings y conectar a la base de datos de forma asíncrona.

---

## Tema: Archivo .env

### Subtopic: Variables de entorno

Crear `.env` en la raíz del proyecto:

```env
APP_NAME="Mi API"
ADMIN_EMAIL="admin@miapi.com"
DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/miapi"
DATABASE_RAM_URL="sqlite+aiosqlite://"
SECRET_KEY="supersecretkey123"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## Tema: Stack Tecnológico

### Subtopic: Componentes del Stack

Cada tecnología tiene un rol específico. Esta es la combinación moderna para APIs asíncronas:

| Componente | Tecnología | Propósito |
|------------|-----------|-----------|
| Framework Web | **FastAPI** | API REST con tipado y validación automática |
| ORM | **SQLAlchemy 2.0+** | Mapeo objeto-relacional asíncrono con `Mapped[]` y `mapped_column()` |
| Schemas | **Pydantic v2** | Validación de datos con `BaseModel` y `ConfigDict(from_attributes=True)` |
| Configuración | **Pydantic Settings v2** | Variables de entorno tipadas con `BaseSettings` |
| Base de Datos | **PostgreSQL** (prod) / **SQLite en RAM** (test) | Motor principal y pruebas |
| Migraciones | **Alembic** | Control de versiones del esquema |
| Testing | **pytest** + **pytest-asyncio** + **httpx.AsyncClient** | Pruebas unitarias y de integración |
| Autenticación | **JWT** + **bcrypt** + **OAuth2PasswordBearer** | Seguridad de endpoints |

---

## Tema: Configuración de la App (main.py)

### Subtopic: Crear la instancia de FastAPI

El punto de entrada define la instancia de FastAPI con metadatos, habilita CORS para comunicación con el frontend y registra todos los routers.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import rt_product, rt_user, rt_distributor, rt_order, rt_order_item, auth, inventory, reports
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    description="API - Descripción del proyecto",
    version="1.0.0"
)

# Habilitar CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers con prefix y tags
app.include_router(rt_product.router, prefix="/router/rt_products", tags=["products"])
app.include_router(rt_user.router, prefix="/router/rt_users", tags=["users"])
app.include_router(rt_distributor.router, prefix="/router/rt_distributors", tags=["distributors"])
app.include_router(rt_order.router, prefix="/router/rt_orders", tags=["orders"])
app.include_router(rt_order_item.router, prefix="/router/rt_order_items", tags=["order_items"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(inventory.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
```

> **Aprende**: Cada router se registra con un `prefix` único (patrón `/router/rt_{entidad}`) y `tags` que agrupan los endpoints en la documentación automática de Swagger (`/docs`). CORS abierto (`"*"`) es solo para desarrollo — en producción, restringe al dominio del frontend.

---

## Tema: Configuración con Pydantic Settings

### Subtopic: Variables de entorno tipadas

Las variables de entorno se definen como atributos tipados de una clase `Settings` que hereda de `BaseSettings`. Esto asegura que cualquier variable faltante lance un error en el arranque, no en ejecución.

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

    # Cloudflare R2 Configuration (opcional)
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_endpoint: str = ""
    r2_bucket_name: str = "mi-bucket"
    r2_public_url: str = ""


settings = Settings()


def get_settings():
    return settings
```

> **Aprende**: `extra="forbid"` evita que variables mal escritas pasen desapercibidas. Si el `.env` tiene `DATABSE_URL` en vez de `DATABASE_URL`, Pydantic lanzará un error inmediato.

### Subtopic: Singleton de Settings

La instancia `settings = Settings()` se crea una sola vez al importar el módulo. Toda la aplicación accede a la misma configuración sin instanciar repetidamente.

```python
# Desde cualquier parte del proyecto:
from app.core.config import settings

print(settings.app_name)
print(settings.database_url)
```

---

## Tema: Conexión Asíncrona a Base de Datos

### Subtopic: Crear el engine asíncrono

SQLAlchemy 2.0+ ofrece `create_async_engine` para operaciones asíncronas. Combinado con `async_sessionmaker`, obtenemos sesiones que no bloquean el event loop.

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

> **Aprende**: `pool_pre_ping=True` verifica que la conexión en el pool siga viva antes de usarla, previniendo errores por conexiones muertas. `expire_on_commit=False` evita que SQLAlchemy invalide los objetos después del commit, permitiendo devolverlos como respuesta de API sin errores de `DetachedInstanceError`.

### Subtopic: El generador `get_db`

La función `get_db` es un **generador asíncrono** que usa `yield` para proporcionar la sesión. FastAPI la usa como dependencia, asegurando que la sesión se cree al iniciar la petición y se cierre automáticamente al finalizar.

```python
# Uso en un endpoint:
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db


@router.get("/items")
async def get_items(conex: AsyncSession = Depends(get_db)):
    # conex está lista para usar
    # se cierra automáticamente al terminar la petición
    ...
```

---

> **Siguiente**: `04-models-sqlalchemy.md` — Aprende a definir modelos SQLAlchemy con tipado estricto.
