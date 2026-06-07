# 10 — Seguridad y Autenticación

> **Objetivo**: Aprender a implementar autenticación JWT, protección de rutas por roles y dependencias de seguridad.

---

## Tema: Dependencias de Seguridad

### Subtopic: OAuth2PasswordBearer y get_current_user

Define las dependencias en orden de restricción creciente.

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
```

### Subtopic: Verificación de roles

Define funciones específicas por rol y una función genérica `require_role`.

```python
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

> **Aprende**: Las dependencias se encadenan. El orden es: `get_current_user` → verificar token → buscar usuario en BD. Luego, las funciones de rol (`get_current_admin`, `get_current_seller`) llaman a `get_current_user` y validan el rol.

---

## Tema: JWT + bcrypt

### Subtopic: app/core/security.py — crear y verificar tokens

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

> **Aprende**: `bcrypt.checkpw()` compara contraseña plana vs hash. `jwt.encode()` crea el token con expiración. El `TokenData` es un modelo Pydantic que tipa la información contenida en el token.

---

## Tema: Endpoint de Login

### Subtopic: POST /auth/login

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

---

## Tema: Rutas Protegidas

### Subtopic: Cómo usar las dependencias de seguridad

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

> **Aprende**: La dependencia se inyecta como parámetro de la función. FastAPI ejecuta `get_current_user` primero, y luego la función de rol (`get_current_admin`, `get_current_seller` o `require_role`). Si el rol no es válido, se retorna 403 automáticamente.

---

> **Siguiente**: `11-queries-and-eager-loading.md` — Queries avanzadas y eager loading.
