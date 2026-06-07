# 13 — Seed Data

> **Objetivo**: Aprender a crear scripts de seed para poblar la base de datos con datos iniciales.

---

## Tema: Script de Seed

### Subtopic: Estructura con verificación de existencia

Usa el mismo patrón asíncrono con verificación de existencia previa para evitar duplicados.

```python
async def seed_users(conex: AsyncSession):
    users_data = [
        {
            "name": "Admin Principal",
            "email": "admin@miapi.com",
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

> **Aprende**: Siempre verifica si el registro ya existe antes de insertarlo. Esto permite ejecutar el seed múltiples veces sin errores de duplicados.

### Subtopic: Punto de entrada principal

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

> **Aprende**: El script se ejecuta con `python app/scripts/seed.py`. Primero crea las tablas si no existen, luego ejecuta cada función de seed. Si algo falla, hace rollback de todo.

---

> **Siguiente**: `14-implementation-checklist.md` — Checklist para implementar un nuevo módulo.
