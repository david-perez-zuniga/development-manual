# 09 — Testing

> **Objetivo**: Aprender a escribir tests automatizados para APIs FastAPI usando pytest, SQLite en RAM y httpx.

---

## Tema: Configuración de pytest

### Subtopic: pytest.ini

```ini
[pytest]
pythonpath = .
env_files = .env
asyncio_mode = auto
```

> **Aprende**: `asyncio_mode = auto` permite que las funciones `async` de test se ejecuten automáticamente sin decoradores adicionales. Aunque por claridad se sigue usando `@pytest.mark.asyncio`.

---

## Tema: Base de Datos en RAM para Tests

### Subtopic: Configurar engine de test

Siempre usa SQLite en RAM (`aiosqlite`) para tests. La URL viene de `settings.database_ram_url`.

```python
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.database import get_db, Base
from app.core.config import settings

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

---

## Tema: Fixtures

### Subtopic: setup_database (autouse)

Crea y destruye tablas automáticamente para cada sesión de test.

```python
@pytest.fixture(autouse=True)
async def setup_database():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Crear datos de prueba
    async with TestingSessionLocal() as session:
        test_user = User(
            name="Test User",
            email="test@user.com",
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

> **Aprende**: `autouse=True` hace que el fixture se ejecute automáticamente para cada test sin necesidad de declararlo como parámetro. Crea datos de prueba básicos (usuario, distribuidor) que los tests pueden usar.

### Subtopic: Dependency Overrides

Reemplaza las dependencias reales por las de test.

```python
async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


async def override_get_current_seller():
    async with TestingSessionLocal() as session:
        from sqlalchemy import select
        stmt = select(User).where(User.email == "test@user.com")
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

> **Aprende**: `app.dependency_overrides` es el mecanismo de FastAPI para reemplazar dependencias en tests. `ASGITransport(app=app)` permite testear la API sin necesidad de un servidor HTTP real. El fixture `client` se pasa a cada test para hacer peticiones.

---

## Tema: Tests CRUD

### Subtopic: Estructura Arrange → Act → Assert

Cada test sigue el patrón: preparar datos (Arrange), ejecutar la acción (Act), verificar resultados (Assert).

### Subtopic: CREATE

```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_product_success(client: AsyncClient, test_distributor):
    """Test creating a product successfully."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "electrónica",
        "distributor_id": str(test_distributor.id)
    }

    response = await client.post("/router/rt_products/", data=product_data)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["description"] == "Test description"
    assert float(data["price"]) == 99.99
    assert data["stock"] == 10
    assert data["category"] == "electrónica"
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
```

### Subtopic: GET (List)

```python
@pytest.mark.asyncio
async def test_get_products_success(client: AsyncClient, test_distributor):
    """Test getting all products."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "electrónica",
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
```

### Subtopic: GET (Single)

```python
@pytest.mark.asyncio
async def test_get_product_success(client: AsyncClient, test_distributor):
    """Test getting a single product by ID."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "electrónica",
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
```

### Subtopic: PATCH

```python
@pytest.mark.asyncio
async def test_update_product_success(client: AsyncClient, test_distributor):
    """Test updating a product successfully."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "electrónica",
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
        "category": "electrónica",
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
```

> **Aprende**: El test `test_update_product_partial` verifica que al enviar solo `name`, los demás campos (como `description`) no se modifiquen. Esto asegura que el PATCH parcial funciona correctamente.

### Subtopic: DELETE

```python
@pytest.mark.asyncio
async def test_delete_product_success(client: AsyncClient, test_distributor):
    """Test deleting a product successfully."""
    product_data = {
        "name": "Test Product",
        "description": "Test description",
        "price": "99.99",
        "stock": "10",
        "category": "electrónica",
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

> **Aprende**: Después del DELETE exitoso (204), se hace un GET para confirmar que el recurso ya no existe (404). Esto verifica que la eliminación fue efectiva.

---

> **Siguiente**: `10-security-and-auth.md` — Seguridad y autenticación con JWT.
