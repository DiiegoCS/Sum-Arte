# Instrucciones para Probar Sum-Arte

## Prerrequisitos

1. Python 3.13 instalado
2. Node.js 20+ instalado
3. Docker y Docker Compose instalados (opcional, para desarrollo con contenedores)

## Pasos para Probar el Backend

### 1. Instalar Dependencias del Backend

```bash
cd Back
pip install -r requirements.txt
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en `Back/core/.env` con el siguiente contenido:

```env
SECRET_KEY=tu-clave-secreta-aqui-genera-una-aleatoria
DEBUG=True
ALLOWED_HOSTS_DEV=localhost,127.0.0.1
CORS_ORIGIN_WHITELIST_DEV=http://localhost:3000
CSRF_TRUSTED_ORIGINS_DEV=http://localhost:3000
```

Para generar una SECRET_KEY, puedes usar:
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Crear y Aplicar Migraciones

```bash
cd Back
python manage.py makemigrations
python manage.py migrate
```

### 4. Crear un Superusuario (opcional, para pruebas)

```bash
python manage.py createsuperuser
```

### 5. Ejecutar el Servidor de Desarrollo

```bash
python manage.py runserver
```

El backend estará disponible en `http://localhost:8000`

### 6. Verificar que la API Funciona

Abre en tu navegador:
- API Root: `http://localhost:8000/api/`
- Admin Panel: `http://localhost:8000/admin/`

## Pasos para Probar el Frontend

### 1. Instalar Dependencias del Frontend

```bash
cd Front
npm install
```

### 2. Ejecutar el Servidor de Desarrollo

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173` (puerto por defecto de Vite)

### 3. Probar la Aplicación

1. Abre `http://localhost:5173` en tu navegador
2. Deberías ver la página de login
3. Inicia sesión con las credenciales del superusuario creado
4. Navega por el dashboard y prueba las funcionalidades

## Usando Docker Compose (Recomendado)

### 1. Asegúrate de tener el archivo .env configurado

Crea `Back/core/.env` como se indicó arriba.

### 2. Construir y Ejecutar los Contenedores

```bash
# Desde la raíz del proyecto
docker-compose up --build
```

Esto iniciará:
- Backend en `http://localhost:8000`
- Frontend en `http://localhost:3000`

### 3. Crear Migraciones y Superusuario (dentro del contenedor)

```bash
# En otra terminal
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

## Endpoints de la API Disponibles

- `POST /api/token/` - Obtener token JWT (login)
- `POST /api/token/refresh/` - Refrescar token
- `POST /api/token/verify/` - Verificar token
- `GET /api/proyectos/` - Listar proyectos
- `GET /api/transacciones/` - Listar transacciones
- `GET /api/dashboard/metrics/` - Métricas del dashboard
- Y muchos más...

## Notas Importantes

1. **Primera vez**: Necesitarás crear datos de prueba (organizaciones, proyectos, usuarios, etc.) desde el admin de Django o mediante la API.

2. **CORS**: Si pruebas frontend y backend por separado, asegúrate de que las URLs en CORS_ORIGIN_WHITELIST_DEV coincidan con la URL del frontend.

3. **Base de datos**: Por defecto se usa SQLite (`db.sqlite3`). Para producción, configura PostgreSQL en el `.env`.

4. **Errores comunes**:
   - Si ves errores de importación, verifica que todas las dependencias estén instaladas
   - Si hay errores de migración, elimina `db.sqlite3` y vuelve a ejecutar `makemigrations` y `migrate`
   - Si el frontend no se conecta al backend, verifica la configuración de proxy en `Front/nginx/default.conf`

## Próximos Pasos Después de Probar

Una vez que hayas verificado que todo funciona:
1. Crear datos de prueba (organizaciones, proyectos, usuarios con roles)
2. Probar el flujo completo: crear transacción → aprobar → ver en dashboard
3. Continuar con las funcionalidades pendientes según el plan



