# 02 — Instalación de Dependencias

> **Objetivo**: Crear el proyecto, el entorno virtual e instalar todas las dependencias necesarias para el stack.

---

## 1. Crear y Activar Entorno Virtual

Usa siempre entornos virtuales para aislar dependencias:

```bash
# Crear entorno virtual
python3 -m venv venv

# Activar
source venv/bin/activate      # Linux/macOS
# venv\Scripts\activate       # Windows

# Verificar que se activó
which python
# Debe apuntar a ./venv/bin/python
```

---

## 2. Instalar Dependencias

### Instalación básica (FastAPI + servidor)
```bash
pip install fastapi
pip install "uvicorn[standard]"
```

### Stack completo
```bash
pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary alembic
```

### Stack asíncrono
```bash
pip install fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg aiosqlite alembic
```

### Pydantic Settings (variables de entorno)
```bash
pip install pydantic-settings
```

### Autenticación
```bash
pip install python-jose[cryptography] bcrypt
```

### Testing
```bash
pip install pytest pytest-asyncio httpx
```

### Cliente S3 (para almacenamiento de archivos)
```bash
pip install boto3
```

### Guardar dependencias
```bash
pip freeze > requirements.txt
```

---

> **Siguiente**: `03-application-configuration.md` — Configura la aplicación, las variables de entorno y la conexión a base de datos.
