# 01 — Arquitectura del Proyecto

> **Objetivo**: Entender cómo se organiza el proyecto en capas, por qué se eligió esta arquitectura y cuáles son las alternativas.

---

## Tema: ¿Por qué una Arquitectura por Capas?

### Subtopic: Problema que resuelve

Cuando una API crece, tener todo el código mezclado (lógica de negocio, acceso a datos, validación, rutas) vuelve el proyecto imposible de mantener. La **arquitectura por capas** separa responsabilidades para que cada pieza tenga un rol claro y único.

### Subtopic: Beneficios

| Beneficio | Descripción |
|-----------|-------------|
| **Separación de concerns** | Cada capa sabe solo lo que necesita saber |
| **Testabilidad** | Puedes testear cada capa de forma aislada |
| **Mantenibilidad** | Cambiar una capa no afecta a las demás |
| **Reusabilidad** | Los schemas y modelos se usan desde múltiples rutas |
| **Escalabilidad** | Equipos grandes pueden trabajar en paralelo sin pisarse |

---

## Tema: Tipos de Arquitectura

### Subtopic: MVC (Model-View-Controller)

La más conocida en web tradicional (Django, Rails). Separa en:
- **Model**: Datos y lógica de negocio
- **View**: Presentación (templates HTML)
- **Controller**: Maneja requests y orquesta

No es ideal para APIs porque la "View" no aplica (no hay HTML que renderizar) y el Controller tiende a acumular demasiada lógica.

### Subtopic: Hexagonal (Ports & Adapters)

Centrada en el dominio de negocio en el centro, con "puertos" hacia el exterior (BD, HTTP, archivos). Ideal para aplicaciones con lógica de negocio compleja, pero puede ser excesiva para APIs CRUD estándar.

### Subtopic: Clean Architecture (Robert C. Martin)

Variación de la hexagonal con más capas (entidades, casos de uso, adaptadores). Excelente para proyectos grandes y complejos, pero tiene overhead de boilerplate.

### Subtopic: Arquitectura por Capas (N-Layer) — Nuestra elección

Es la que usamos en este proyecto. Simple, pragmática y suficiente para APIs CRUD. Separa en 4 capas claras:

| Capa | Responsabilidad |
|------|-----------------|
| **Routes** | Endpoints HTTP, orquestan la petición |
| **Schemas** | Validación de datos de entrada/salida |
| **Models** | Definición de tablas y relaciones en BD |
| **Core** | Configuración global, seguridad, storage |

> **Aprende**: Elegimos capas porque es el balance óptimo entre organización y simplicidad para proyectos FastAPI. No necesitas hexagonal si tu dominio no es críticamente complejo.

---

## Tema: Árbol del Proyecto

### Subtopic: Estructura de directorios

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
│   │   └── storage.py               # Almacenamiento (S3 compatible)
│   ├── models/
│   │   ├── base.py                  # DeclarativeBase
│   │   ├── md_Product.py
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

---

## Tema: Separación por Capas

### Subtopic: Responsabilidades de cada capa

| Capa | Carpeta | Prefijo Archivo | Responsabilidad |
|------|---------|-----------------|-----------------|
| Modelos | `app/models/` | `md_` | Definición de tablas SQLAlchemy + Enums |
| Schemas | `app/schemas/` | `{entidad}_schema` | Validación Pydantic (Create/Read/Update) |
| Rutas | `app/api/routes/` | `rt_` | Endpoints CRUD + lógica de negocio |
| Core | `app/core/` | — | Config, DB, seguridad, storage |
| Tests | `tests/` | `test_rt_` | Pruebas por entidad |

### Subtopic: Flujo de una petición

```
Cliente → HTTP Request → Router (rt_*) → Schema (validación)
    → Dependencia get_db (inyecta sesión)
    → Lógica de negocio (CRUD)
    → Modelo SQLAlchemy (consulta)
    → Schema Read (serializa respuesta)
    → HTTP Response → Cliente
```

---

## Tema: Base Declarative para Modelos

### Subtopic: Crear la base de modelos

Todos los modelos SQLAlchemy heredan de una misma clase `Base`. Se define usando `DeclarativeBase` (nueva API de SQLAlchemy 2.0):

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

> **Aprende**: Usa `DeclarativeBase` (importado de `sqlalchemy.orm`), NO uses `declarative_base()` (estilo antiguo). La nueva API es más limpia y tiene mejor soporte de tipos.

---

## Tema: BaseSchema para Pydantic

### Subtopic: Schema base para todas las entidades

Todas las schemas heredan de `BaseSchema`. Se define en `app/schemas/__init__.py`:

```python
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
```

> **Aprende**: `from_attributes=True` permite crear instancias del schema desde objetos SQLAlchemy (mapea automáticamente atributos de clase). `str_strip_whitespace=True` limpia espacios en blanco de strings automáticamente.

Cada schema module importa `BaseSchema` desde el paquete:

```python
from . import BaseSchema
```

---

> **Siguiente**: `02-dependency-installation.md` — Aprende a instalar dependencias y crear el entorno del proyecto.
