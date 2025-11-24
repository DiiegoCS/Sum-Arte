# Resumen: Listo para Probar Sum-Arte

## ✅ Lo que está implementado

### Backend (Django)
- ✅ Autenticación JWT completa
- ✅ Modelos con todas las relaciones necesarias
- ✅ Serializers con validaciones y campos calculados
- ✅ ViewSets con permisos y filtros
- ✅ Servicios de negocio (TransactionService, BudgetService, RenditionService)
- ✅ Validadores de controles de negocio (C001-C011)
- ✅ Sistema de permisos basado en roles
- ✅ Endpoints de dashboard con métricas
- ✅ Flujo de aprobación de transacciones

### Frontend (React)
- ✅ Autenticación con JWT
- ✅ Servicios API centralizados (axios con interceptores)
- ✅ Contexto de autenticación
- ✅ Página de Login
- ✅ Dashboard con gráficos (Recharts)
- ✅ Formulario de registro de gastos completo
- ✅ Rutas protegidas
- ✅ Navbar con logout

## 🚀 Inicio Rápido

### 1. Backend

```bash
# Navegar a la carpeta Back
cd Back

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo .env (si no existe)
# Copia el contenido de abajo a Back/core/.env
```

**Contenido de `Back/core/.env`:**
```env
SECRET_KEY=django-insecure-cambiar-esta-clave-en-produccion-genera-una-nueva
DEBUG=True
ALLOWED_HOSTS_DEV=localhost,127.0.0.1
CORS_ORIGIN_WHITELIST_DEV=http://localhost:5173,http://localhost:3000
CSRF_TRUSTED_ORIGINS_DEV=http://localhost:5173,http://localhost:3000
```

**Generar SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

```bash
# Crear y aplicar migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser
# (Sigue las instrucciones en pantalla)

# Crear datos de prueba (opcional pero recomendado)
python manage.py shell
# Luego copia y pega el contenido de crear_datos_prueba.py

# Iniciar servidor
python manage.py runserver
```

El backend estará en: `http://localhost:8000`

### 2. Frontend

```bash
# Navegar a la carpeta Front
cd Front

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará en: `http://localhost:5173` (o el puerto que Vite asigne)

## 📝 Crear Datos de Prueba

### Opción 1: Usando el script (Recomendado)

```bash
cd Back
python manage.py shell
```

Luego copia y pega el contenido completo del archivo `Back/crear_datos_prueba.py`

Esto creará:
- Una organización
- Dos usuarios (ejecutor1 y admin1, ambos con password: test123)
- Un proyecto
- Ítems presupuestarios
- Un proveedor
- Roles y asignaciones

### Opción 2: Desde el Admin de Django

1. Accede a `http://localhost:8000/admin/`
2. Inicia sesión con el superusuario creado
3. Crea manualmente:
   - Organización
   - Proyecto
   - Ítems Presupuestarios
   - Proveedor
   - Roles
   - Asignaciones Usuario-Rol-Proyecto

## 🧪 Pruebas Básicas

### 1. Probar Login
- Abre `http://localhost:5173`
- Deberías ver la página de login
- Inicia sesión con:
  - Usuario: `ejecutor1` (o el que creaste)
  - Password: `test123`
- Deberías ser redirigido al dashboard

### 2. Ver Dashboard
- Deberías ver:
  - Tarjetas con métricas (Presupuesto Total, Monto Ejecutado, etc.)
  - Gráficos (Gastos por Ítem, Estado de Rendiciones)
  - Lista de proyectos

### 3. Registrar un Gasto
- Haz clic en "Nuevo Gasto +" o navega a `/registrar-gasto`
- Completa el formulario:
  - Selecciona un proyecto
  - Selecciona o crea un proveedor
  - Ingresa monto, fecha, número de documento
  - Selecciona un ítem presupuestario
  - Sube al menos un archivo de evidencia
- Guarda el gasto
- Deberías ver un mensaje de éxito y ser redirigido al dashboard

### 4. Probar API directamente
Puedes usar Postman, curl, o el navegador para probar:

```bash
# Obtener token
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"ejecutor1","password":"test123"}'

# Usar el token para obtener proyectos
curl -X GET http://localhost:8000/api/proyectos/ \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## ⚠️ Problemas Conocidos

1. **Proveedores en el formulario**: El formulario permite crear proveedores, pero falta implementar el servicio completo. Por ahora, crea proveedores desde el admin.

2. **Roles**: Para probar aprobación de transacciones, necesitas usuarios con roles específicos asignados a proyectos. Usa el script de datos de prueba o créalos manualmente.

3. **CORS**: Si tienes problemas de CORS, verifica que `CORS_ORIGIN_WHITELIST_DEV` en `.env` incluya la URL exacta del frontend (incluyendo el puerto).

## 📋 Checklist de Verificación

- [ ] Backend inicia sin errores
- [ ] Frontend inicia sin errores
- [ ] Puedo hacer login
- [ ] Veo el dashboard con datos
- [ ] Puedo registrar un gasto
- [ ] Las peticiones API funcionan (ver consola del navegador)
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en la terminal del backend

## 🔍 Verificar que Todo Funciona

### Backend
- Abre `http://localhost:8000/api/` - Deberías ver la lista de endpoints
- Abre `http://localhost:8000/admin/` - Deberías poder iniciar sesión

### Frontend
- Abre `http://localhost:5173` - Deberías ver la página de login
- Abre la consola del navegador (F12) - No debería haber errores
- Verifica que las peticiones API se están haciendo correctamente

## 📚 Archivos de Ayuda

- `Back/INSTRUCCIONES_PRUEBA.md` - Instrucciones detalladas
- `TESTING_CHECKLIST.md` - Checklist completo de pruebas
- `Back/crear_datos_prueba.py` - Script para crear datos de prueba

## 🎯 Próximos Pasos

Una vez que verifiques que todo funciona:
1. Probar el flujo completo de aprobación de transacciones
2. Probar los controles de negocio (validaciones)
3. Continuar con las funcionalidades pendientes según el plan

## 💡 Tips

- Usa la consola del navegador (F12) para ver errores de JavaScript
- Usa la terminal del backend para ver errores de Django
- Revisa los logs si algo no funciona
- Los tokens JWT se guardan en localStorage (puedes verlos en DevTools)

