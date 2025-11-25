# Checklist de Pruebas - Sum-Arte

## Configuración Inicial

### Backend
- [ ] Instalar dependencias: `pip install -r Back/requirements.txt`
- [ ] Crear archivo `.env` en `Back/core/.env` con SECRET_KEY y configuración
- [ ] Ejecutar migraciones: `python manage.py makemigrations` y `python manage.py migrate`
- [ ] Crear superusuario: `python manage.py createsuperuser`
- [ ] Iniciar servidor: `python manage.py runserver`
- [ ] Verificar que el servidor responde en `http://localhost:8000`

### Frontend
- [ ] Instalar dependencias: `npm install` en `Front/`
- [ ] Verificar que `axios`, `recharts`, `react-toastify` están instalados
- [ ] Iniciar servidor de desarrollo: `npm run dev`
- [ ] Verificar que el frontend responde en `http://localhost:5173` (o el puerto que Vite asigne)

## Pruebas de Autenticación

- [ ] Acceder a la página de login
- [ ] Intentar login con credenciales incorrectas (debe mostrar error)
- [ ] Login exitoso con superusuario creado
- [ ] Verificar que se redirige al dashboard después del login
- [ ] Verificar que el token se guarda en localStorage
- [ ] Probar logout (debe limpiar tokens y redirigir a login)

## Pruebas de API Backend

### Endpoints de Autenticación
- [ ] `POST /api/token/` - Obtener token JWT
- [ ] `POST /api/token/refresh/` - Refrescar token
- [ ] `POST /api/token/verify/` - Verificar token

### Endpoints de Datos
- [ ] `GET /api/proyectos/` - Listar proyectos (requiere autenticación)
- [ ] `GET /api/transacciones/` - Listar transacciones
- [ ] `GET /api/dashboard/metrics/` - Obtener métricas del dashboard
- [ ] `GET /api/items-presupuestarios/?proyecto=X` - Listar ítems de un proyecto

## Pruebas de Funcionalidad

### Dashboard
- [ ] Verificar que se cargan los proyectos
- [ ] Verificar que se muestran las métricas (tarjetas de resumen)
- [ ] Verificar que se muestran los gráficos (Gastos por Ítem, Estado Rendiciones)
- [ ] Verificar que los proyectos se muestran como tarjetas

### Registro de Gastos
- [ ] Acceder a la página de registro de gastos
- [ ] Seleccionar un proyecto
- [ ] Verificar que se cargan los ítems presupuestarios del proyecto
- [ ] Seleccionar un ítem presupuestario
- [ ] Verificar que se cargan los subítems (si existen)
- [ ] Completar el formulario con todos los campos
- [ ] Subir un archivo de evidencia
- [ ] Enviar el formulario
- [ ] Verificar que la transacción se crea en estado "pendiente"

### Aprobación de Transacciones
- [ ] Ver transacciones pendientes (requiere otro usuario con rol Admin Proyecto)
- [ ] Aprobar una transacción
- [ ] Verificar que el estado cambia a "aprobado"
- [ ] Verificar que los montos ejecutados se actualizan

## Problemas Conocidos a Verificar

1. **Proveedores**: El formulario de registro de gastos tiene un campo para crear proveedores, pero falta implementar el servicio. Por ahora, necesitarás crear proveedores desde el admin de Django.

2. **Roles de Usuario**: Para probar la aprobación de transacciones, necesitas:
   - Crear roles en la base de datos
   - Asignar usuarios a proyectos con roles específicos
   - Esto se puede hacer desde el admin de Django

3. **Datos de Prueba**: Necesitarás crear:
   - Al menos una Organización
   - Al menos un Proyecto
   - Al menos un Proveedor
   - Ítems presupuestarios para el proyecto
   - Usuarios con roles asignados

## Comandos Útiles para Crear Datos de Prueba

### Desde el Admin de Django
1. Acceder a `http://localhost:8000/admin/`
2. Crear una Organización
3. Crear un Proyecto asociado a la organización
4. Crear Ítems Presupuestarios para el proyecto
5. Crear un Proveedor
6. Crear Roles (si no existen)
7. Asignar usuarios a proyectos con roles

### Desde la Shell de Django
```python
python manage.py shell

# Ejemplo de creación de datos
from api.models import Organizacion, Proyecto, Item_Presupuestario, Proveedor, Rol, Usuario_Rol_Proyecto
from django.contrib.auth import get_user_model
from datetime import date, timedelta

Usuario = get_user_model()

# Crear organización
org = Organizacion.objects.create(
    nombre_organizacion="Organización de Prueba",
    rut_organizacion="12345678-9",
    plan_suscripcion="mensual",
    estado_suscripcion="activo",
    fecha_inicio_suscripcion=date.today()
)

# Crear proyecto
proyecto = Proyecto.objects.create(
    nombre_proyecto="Proyecto de Prueba",
    fecha_inicio_proyecto=date.today(),
    fecha_fin_proyecto=date.today() + timedelta(days=365),
    presupuesto_total=1000000,
    id_organizacion=org
)

# Crear ítem presupuestario
item = Item_Presupuestario.objects.create(
    proyecto=proyecto,
    nombre_item_presupuesto="Materiales",
    monto_asignado_item=500000,
    categoria_item="Materiales"
)

# Crear proveedor
proveedor = Proveedor.objects.create(
    nombre_proveedor="Proveedor de Prueba",
    rut_proveedor="98765432-1",
    email_proveedor="proveedor@test.com"
)
```

## Verificación de Errores Comunes

- [ ] Verificar que no hay errores en la consola del navegador
- [ ] Verificar que no hay errores en la terminal del backend
- [ ] Verificar que las peticiones API devuelven códigos de estado correctos (200, 201, etc.)
- [ ] Verificar que los tokens JWT se están enviando en las peticiones
- [ ] Verificar que CORS está configurado correctamente

## Próximos Pasos Después de Probar

Una vez que hayas verificado que todo funciona básicamente:
1. Crear más datos de prueba
2. Probar el flujo completo de aprobación
3. Probar los controles de negocio (validaciones)
4. Continuar con las funcionalidades pendientes



