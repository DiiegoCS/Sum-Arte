"""
Script para crear datos de prueba en Sum-Arte.

Ejecutar con: python manage.py shell < crear_datos_prueba.py
O copiar y pegar el contenido en: python manage.py shell
"""

from api.models import (
    Organizacion, Proyecto, Item_Presupuestario, Subitem_Presupuestario,
    Proveedor, Rol, Usuario_Rol_Proyecto, Usuario
)
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal

Usuario = get_user_model()

print("=" * 50)
print("Creando datos de prueba para Sum-Arte")
print("=" * 50)

# 1. Crear Organización
print("\n1. Creando organización...")
org, created = Organizacion.objects.get_or_create(
    rut_organizacion="12345678-9",
    defaults={
        'nombre_organizacion': 'Organización Cultural de Prueba',
        'plan_suscripcion': 'mensual',
        'estado_suscripcion': 'activo',
        'fecha_inicio_suscripcion': date.today()
    }
)
if created:
    print(f"   ✓ Organización creada: {org.nombre_organizacion}")
else:
    print(f"   → Organización ya existe: {org.nombre_organizacion}")

# 2. Crear Usuario de prueba (si no existe)
print("\n2. Creando usuario de prueba...")
usuario, created = Usuario.objects.get_or_create(
    username='ejecutor1',
    defaults={
        'email': 'ejecutor1@test.com',
        'first_name': 'Ejecutor',
        'last_name': 'Uno',
        'id_organizacion': org
    }
)
if created:
    usuario.set_password('test123')
    usuario.save()
    print(f"   ✓ Usuario creado: {usuario.username} (password: test123)")
else:
    print(f"   → Usuario ya existe: {usuario.username}")

# Crear usuario Admin Proyecto
admin_user, created = Usuario.objects.get_or_create(
    username='admin1',
    defaults={
        'email': 'admin1@test.com',
        'first_name': 'Admin',
        'last_name': 'Proyecto',
        'id_organizacion': org
    }
)
if created:
    admin_user.set_password('test123')
    admin_user.save()
    print(f"   ✓ Usuario Admin creado: {admin_user.username} (password: test123)")
else:
    print(f"   → Usuario Admin ya existe: {admin_user.username}")

# 3. Crear Roles
print("\n3. Creando roles...")
rol_ejecutor, _ = Rol.objects.get_or_create(
    nombre_rol='ejecutor',
    defaults={'descripcion_rol': 'Ejecutor de proyectos'}
)
rol_admin, _ = Rol.objects.get_or_create(
    nombre_rol='admin proyecto',
    defaults={'descripcion_rol': 'Administrador de proyectos'}
)
print(f"   ✓ Roles creados/verificados")

# 4. Crear Proyecto
print("\n4. Creando proyecto...")
proyecto, created = Proyecto.objects.get_or_create(
    nombre_proyecto='Proyecto Cultural de Prueba',
    defaults={
        'fecha_inicio_proyecto': date.today(),
        'fecha_fin_proyecto': date.today() + timedelta(days=365),
        'presupuesto_total': Decimal('1000000.00'),
        'monto_ejecutado_proyecto': Decimal('0.00'),
        'estado_proyecto': 'activo',
        'id_organizacion': org
    }
)
if created:
    print(f"   ✓ Proyecto creado: {proyecto.nombre_proyecto}")
else:
    print(f"   → Proyecto ya existe: {proyecto.nombre_proyecto}")

# 5. Asignar roles a usuarios
print("\n5. Asignando roles a usuarios...")
Usuario_Rol_Proyecto.objects.get_or_create(
    usuario=usuario,
    rol=rol_ejecutor,
    proyecto=proyecto
)
Usuario_Rol_Proyecto.objects.get_or_create(
    usuario=admin_user,
    rol=rol_admin,
    proyecto=proyecto
)
print(f"   ✓ Roles asignados")

# 6. Crear Ítems Presupuestarios
print("\n6. Creando ítems presupuestarios...")
items_data = [
    {'nombre': 'Materiales', 'monto': 300000, 'categoria': 'Materiales'},
    {'nombre': 'Servicios', 'monto': 400000, 'categoria': 'Servicios'},
    {'nombre': 'Equipamiento', 'monto': 200000, 'categoria': 'Equipamiento'},
    {'nombre': 'Otros', 'monto': 100000, 'categoria': None},
]

for item_data in items_data:
    item, created = Item_Presupuestario.objects.get_or_create(
        proyecto=proyecto,
        nombre_item_presupuesto=item_data['nombre'],
        defaults={
            'monto_asignado_item': Decimal(str(item_data['monto'])),
            'monto_ejecutado_item': Decimal('0.00'),
            'categoria_item': item_data['categoria']
        }
    )
    if created:
        print(f"   ✓ Ítem creado: {item.nombre_item_presupuesto}")

# 7. Crear Proveedor
print("\n7. Creando proveedor...")
proveedor, created = Proveedor.objects.get_or_create(
    rut_proveedor="98765432-1",
    defaults={
        'nombre_proveedor': 'Proveedor de Prueba S.A.',
        'email_proveedor': 'contacto@proveedorprueba.com'
    }
)
if created:
    print(f"   ✓ Proveedor creado: {proveedor.nombre_proveedor}")
else:
    print(f"   → Proveedor ya existe: {proveedor.nombre_proveedor}")

print("\n" + "=" * 50)
print("Datos de prueba creados exitosamente!")
print("=" * 50)
print("\nCredenciales para probar:")
print(f"  Ejecutor: ejecutor1 / test123")
print(f"  Admin: admin1 / test123")
print(f"\nProyecto: {proyecto.nombre_proyecto}")
print(f"Organización: {org.nombre_organizacion}")
print("\nPuedes iniciar sesión en el frontend con cualquiera de estos usuarios.")





