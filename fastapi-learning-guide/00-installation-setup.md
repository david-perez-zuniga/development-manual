# 00 — Instalación del Stack

> **Objetivo**: Tener listo el entorno de desarrollo para construir APIs con FastAPI, SQLAlchemy asíncrono y todo el stack moderno.

---

## 1. Requisitos del Sistema

- **Python** 3.10 o superior (recomendado 3.11+)
- **pip** (gestor de paquetes de Python)
- **Git** (control de versiones)
- **Editor**: VS Code (recomendado) o PyCharm
- **Base de datos**: PostgreSQL (opcional para desarrollo local, se puede usar SQLite)

---

## 2. Instalar Python

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv -y
python3 --version
```

### macOS
```bash
brew install python
python3 --version
```

### Windows
Descargar desde [python.org](https://python.org) o usar winget:
```bash
winget install Python.Python.3.11
```

---

## 3. Crear y Activar Entorno Virtual

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

## 4. Instalar Dependencias

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

## 5. Estructura Inicial del Proyecto

```bash
mkdir mi-api && cd mi-api
python3 -m venv venv
source venv/bin/activate

mkdir -p app/core app/models app/schemas app/api/routes app/scripts tests
touch main.py requirements.txt .env
touch app/__init__.py app/core/__init__.py app/models/__init__.py
touch app/schemas/__init__.py app/api/__init__.py app/api/routes/__init__.py
touch app/scripts/__init__.py tests/__init__.py
```

---

## 6. Archivo .env

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

## Resumen de Comandos Rápidos

| Comando | Propósito |
|---------|-----------|
| `python3 -m venv venv` | Crear entorno virtual |
| `source venv/bin/activate` | Activar entorno |
| `pip install fastapi uvicorn` | Instalar FastAPI |
| `pip install -r requirements.txt` | Instalar desde archivo |
| `pip freeze > requirements.txt` | Guardar dependencias |
| `uvicorn main:app --reload` | Iniciar servidor |
| `pytest -v` | Ejecutar tests |

---

> **Siguiente**: Pasa a `01-setup-and-configuration.md` para aprender a configurar la app FastAPI, Pydantic Settings y la conexión a base de datos.
