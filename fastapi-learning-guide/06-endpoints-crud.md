# 06 — Endpoints CRUD

> **Objetivo**: Aprender todos los patrones de endpoints CRUD: creación (JSON y Multipart), lectura (listado e individual), actualización (schema y multipart) y eliminación.

---

## Tema: Reglas Generales de Rutas

### Subtopic: Convenciones

- Variable de conexión SIEMPRE se llama `conex` (nunca `db`, ni `session`)
- Importa modelos con alias `tbl_`: `from app.models.md_Product import Product as tbl_Product`
- Schemas se importan sin alias (usa el nombre de clase directamente)
- Usa `selectinload()` para eager loading de relaciones
- `response_model` siempre especificado
- POST devuelve `status_code=status.HTTP_201_CREATED`
- DELETE devuelve `status_code=status.HTTP_204_NO_CONTENT`
- try/except con 3 bloques: `HTTPException` (re-raise), `IntegrityError` (400 + rollback), `Exception` (500 + rollback)

---

## Tema: ENDPOINT GET

### Subtopic: GET — Listado de entidades

Retorna una lista de todas las entidades. Usa `selectinload` para cargar relaciones y evitar consultas N+1.

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

> **Aprende**: `response_model=list[ProductRead]` le dice a FastAPI que serialice la respuesta como una lista de `ProductRead`. `scalars().all()` obtiene todos los resultados como objetos del modelo.

### Subtopic: GET — Individual por ID

Siempre verifica `scalar_one_or_none()` y lanza 404 si no existe.

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

> **Aprende**: `scalar_one_or_none()` retorna el objeto o `None` si no existe. Este es el patrón estándar para búsquedas por ID. El primer `except HTTPException: raise` asegura que los 404 se propaguen sin ser envueltos en un 500.

---

## Tema: ENDPOINT CREATE (POST)

### Subtopic: POST — Creación vía JSON Schema

Usa este patrón cuando los datos llegan como JSON en el body de la petición. Pydantic valida automáticamente que todos los campos requeridos estén presentes y tengan el tipo correcto.

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

> **Aprende**: `model_dump(exclude_unset=True)` convierte el schema Pydantic a diccionario incluyendo solo los campos que el cliente envió. Si un campo tiene valor por defecto pero el cliente no lo envió, se omite. `await conex.refresh(nuevo)` recarga los valores generados por la BD (como `id` o `created_at`) después del commit.

### Subtopic: POST — Creación vía Multipart con Subida de Archivo

Usa este patrón cuando el endpoint recibe formularios multipart (con archivos). Cada campo se declara individualmente con `Form(...)` (requerido) o `File(None)` (opcional).

```python
@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    name: str = Form(...),
    description: str | None = Form(None),
    price: float = Form(...),
    is_discount: bool = Form(False),
    stock: int = Form(0),
    category: str = Form(...),
    distributor_id: int = Form(...),
    image: UploadFile | None = File(None),
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

> **Aprende**: Con multipart, cada campo se declara individualmente como parámetro de función con `Form(...)` o `File(...)`. Después del commit, si necesitas relaciones cargadas, debes hacer una consulta adicional con `selectinload` porque el `refresh()` no carga relaciones anidadas automáticamente.

---

## Tema: ENDPOINT UPDATE (PATCH)

### Subtopic: PATCH — Actualización vía Schema

Usa `model_dump(exclude_unset=True, exclude_none=True)` para obtener solo los campos enviados. Luego itera con `setattr` para actualizar solo esos campos.

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

> **Aprende**: `exclude_unset=True` omite campos que el cliente no envió. `exclude_none=True` omite campos con valor `None`. La combinación permite actualizar solo los campos que vinieron en la petición. `setattr(user, field, value)` es la forma dinámica de asignar atributos.

### Subtopic: PATCH — Actualización vía Multipart

Cada campo se verifica individualmente con `if campo is not None:`.

```python
@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    name: str | None = Form(None),
    description: str | None = Form(None),
    price: float | None = Form(None),
    is_discount: bool | None = Form(None),
    stock: int | None = Form(None),
    category: str | None = Form(None),
    distributor_id: int | None = Form(None),
    image: UploadFile | None = File(None),
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar producto: {str(e)}"
        )
    except Exception as e:
        print(f"Error con el server: {e}")
        await conex.rollback()
        raise HTTPException(...)
```

> **Aprende**: Con multipart, no puedes usar `model_dump()` porque los campos llegan como parámetros individuales. Cada campo se verifica con `if campo is not None` antes de asignarlo. El flag `delete_image` permite eliminar la imagen existente sin reemplazarla.

---

## Tema: ENDPOINT DELETE (DELETE)

### Subtopic: DELETE — Eliminar entidad

Siempre retorna `status_code=status.HTTP_204_NO_CONTENT` y `return None`.

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

> **Aprende**: DELETE retorna 204 (sin contenido). FastAPI no enviará cuerpo en la respuesta. `await conex.delete(product)` marca el objeto para eliminación, y `commit()` ejecuta la operación.

---

> **Siguiente**: `07-naming-and-type-hints.md` — Convenciones de nombrado y tipado estricto.
