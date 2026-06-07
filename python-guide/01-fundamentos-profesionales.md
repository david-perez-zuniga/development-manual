# 01 — Fundamentos del Entorno Profesional

> **Objetivo**: Comprender el ecosistema base de Python, las herramientas de aislamiento, la gestión de dependencias y las buenas prácticas de seguridad al configurar aplicaciones.

---

## Tema: El Intérprete Nativo de Python

Python no es solo un lenguaje, es un **runtime** que debe convivir con el sistema operativo. Entender cómo funciona el intérprete nativo y los peligros de alterar el sistema es el primer paso para un desarrollo profesional.

### Subtopic: ¿Dónde está instalado Python?

```bash
which python3
python3 --version
```

En sistemas Linux/macOS, el intérprete del sistema suele vivir en `/usr/bin/python3`. En Windows, en `C:\Python3xx\python.exe`.

### Subtopic: El peligro de alterar el SO

Usar `sudo pip install` (Linux/macOS) o instalar paquetes globalmente sin control puede:

| Riesgo | Consecuencia |
|--------|-------------|
| **Romper el intérprete del sistema** | El SO depende de Python para herramientas como `apt`, `yum` o scripts internos. Sobrescribir dependencias puede dejar el sistema inestable o inservible. |
| **Conflictos entre proyectos** | Dos proyectos que requieren versiones distintas de una misma librería no pueden convivir en el mismo espacio global. |
| **Permisos elevados innecesarios** | Ejecutar `pip` con `sudo` otorga acceso total a cualquier paquete instalado, incluyendo código malicioso. |

**Regla de oro**: nunca instalar dependencias de proyecto en el intérprete global del sistema.

---

## Tema: Variables de Entorno — El PATH

El `PATH` es una variable de entorno que le indica al sistema operativo **dónde buscar ejecutables** cuando escribes un comando.

### Subtopic: Cómo funciona

```bash
echo $PATH
```

El shell recorre cada directorio listado en `PATH` en orden hasta encontrar el ejecutable solicitado. El primer acierto gana.

### Subtopic: Peligros de modificar el PATH globalmente

- Añadir directorios al PATH del sistema (`/etc/profile`, `~/.bashrc`) sin cuidado puede provocar que un intérprete de Python incorrecto o una versión equivocada de una herramienta se ejecute inesperadamente.
- Si un directorio con un binario malicioso aparece **antes** que el legítimo en el PATH, se ejecutará el malicioso (ataque de *path hijacking*).

### Subtopic: Buenas prácticas

- Modificar el PATH solo para la sesión activa (`export PATH="/mi/ruta:$PATH"`) o a través de entornos virtuales.
- Verificar siempre qué Python se está usando con `which python` o `python -c "import sys; print(sys.executable)"`.

---

## Tema: Herramientas de Aislamiento — Entornos Virtuales (venv)

Un entorno virtual es un **directorio autocontenido** que incluye su propio intérprete de Python y su propio espacio de paquetes. Esto permite aislar las dependencias de cada proyecto.

### Subtopic: Creación

```bash
python3 -m venv venv
```

Esto crea una carpeta `venv/` en el directorio actual.

### Subtopic: Activación

| Sistema | Comando |
|---------|---------|
| **Linux/macOS** | `source venv/bin/activate` |
| **Windows (cmd)** | `venv\Scripts\activate.bat` |
| **Windows (PowerShell)** | `venv\Scripts\Activate.ps1` |

Una vez activado, el prompt cambia a `(venv) $` y `which python` apunta al intérprete dentro del entorno.

### Subtopic: Anatomía interna

```
venv/
├── bin/               # Intérprete Python, scripts de activación y ejecutables
│   ├── python         # Enlace simbólico al intérprete
│   ├── activate       # Script de activación (bash/zsh)
│   ├── activate.csh
│   ├── activate.fish
│   ├── pip            # Pip del entorno
│   └── ...
├── lib/
│   └── python3.xx/
│       └── site-packages/  # Aquí se instalan las dependencias (pip install)
├── pyvenv.cfg         # Archivo de configuración: versión de Python, home, flags
└── include/           # Archivos de cabecera para compilar extensiones C
```

El archivo `pyvenv.cfg` es clave: contiene la ruta al intérprete base (`home`) y define si el entorno debe ser globalmente accesible. Sin él, el entorno no funciona.

### Subtopic: Desactivación

```bash
deactivate
```

Restaura el `PATH` original y vuelve al intérprete del sistema.

---

## Tema: Gestión Estricta de Dependencias

En un entorno profesional, las dependencias deben ser **explícitas, reproducibles y congeladas**.

### Subtopic: requirements.txt

El archivo clásico para listar dependencias:

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
```

- **Pinchar versiones** (`==`) garantiza reproducibilidad.
- Usar `>=` solo para rangos amplios; nunca en producción sin bloquear.

### Subtopic: Congelar dependencias

```bash
pip freeze > requirements.txt
```

`pip freeze` muestra **todas** las dependencias instaladas (incluyendo sub-dependencias). Esto asegura que otro desarrollador obtenga exactamente los mismos paquetes al ejecutar `pip install -r requirements.txt`.

### Subtopic: Herramientas modernas

| Herramienta | Propósito |
|-------------|-----------|
| **pip-tools** (`pip-compile`) | Compila `requirements.in` en un `requirements.txt` bloqueado, resolviendo el árbol de dependencias. |
| **Poetry** | Gestor moderno todo-en-uno: declara dependencias en `pyproject.toml`, bloquea versiones en `poetry.lock`. |
| **PDM** | Similar a Poetry, con énfasis en estándares PEP 517/518. |
| **uv** | Gestor de paquetes ultrarápido escrito en Rust, compatible con pip y requirements.txt. |

### Subtopic: pyproject.toml — El estándar moderno

```toml
[project]
name = "miapp"
version = "0.1.0"
dependencies = [
    "fastapi>=0.100",
    "sqlalchemy>=2.0",
]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

El `pyproject.toml` es el formato definido por PEP 517/518 y es el reemplazo moderno de `setup.py`. Permite declarar metadatos, dependencias y configuración de herramientas en un solo archivo.

---

## Tema: Configuración de Aplicaciones y Seguridad

Uno de los principios fundamentales del desarrollo seguro es **nunca hardcodear credenciales en el código fuente**.

### Subtopic: El principio de las variables de entorno

La [metodología 12-Factor App](https://12factor.net/config) dicta:

> Almacenar la configuración en variables de entorno.

Esto aplica a: claves de API, credenciales de base de datos, secretos de JWT, URLs de servicios, etc.

### Subtopic: Malas prácticas

```python
# ❌ NUNCA hacer esto
DB_PASSWORD = "supersecreto123"
API_KEY = "sk-abc123..."
SECRET_KEY = "clave-fija"
```

**Riesgos**:
- El secreto queda expuesto en el repositorio (git).
- Cualquier persona con acceso al código puede verlo.
- Rotar credenciales requiere modificar y redeployar el código.

### Subtopic: Buena práctica con variables de entorno

```python
import os

DB_PASSWORD = os.environ["DB_PASSWORD"]
API_KEY = os.getenv("API_KEY")
SECRET_KEY = os.environ.get("SECRET_KEY", "default-inseguro")
```

Acceder a variables de entorno:

| Función | Comportamiento |
|---------|----------------|
| `os.environ["VAR"]` | Lanza `KeyError` si no existe |
| `os.getenv("VAR")` | Devuelve `None` si no existe |
| `os.environ.get("VAR", "default")` | Devuelve un valor por defecto |

### Subtopic: Archivos .env

Para desarrollo local, es común usar un archivo `.env` que nunca se sube al repositorio:

```
# .env (incluir en .gitignore)
DB_PASSWORD=supersecreto123
API_KEY=sk-abc123...
```

```python
from dotenv import load_dotenv
load_dotenv()  # Carga variables del .env antes de acceder con os.environ
```

La librería `python-dotenv` lee el `.env` y las inyecta en `os.environ`.

### Subtopic: .gitignore — el guardián de los secretos

```gitignore
# .gitignore
.env
*.env.local
*.env.production
```

Si por accidente se sube un `.env`, el secreto queda en el historial de git para siempre (incluso si se elimina después).

**Regla de seguridad**: usa un archivo `.env.example` en el repositorio con valores ficticios para que otros desarrolladores sepan qué variables necesita el proyecto.

---

## Resumen Rápido

| Concepto | Principio clave |
|----------|----------------|
| **Intérprete global** | No instalar dependencias de proyecto en el Python del sistema |
| **PATH** | No modificarlo globalmente sin cuidado; los entornos virtuales lo gestionan |
| **Entornos virtuales** | Aislar cada proyecto con `python -m venv` |
| **Dependencias** | Congelar versiones con `pip freeze > requirements.txt` o usar `pyproject.toml` |
| **Seguridad** | Nunca hardcodear secretos; usar variables de entorno y `.env` + `.gitignore` |

---

> **Siguiente paso**: Configurar un proyecto Python profesional desde cero aplicando estos fundamentos.
