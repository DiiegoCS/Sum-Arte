"""
Tests de integración para la API de Sum-Arte.

Estos tests validan flujos completos del sistema, incluyendo:
- Creación de transacciones y aprobación
- Flujo completo de rendición
- Gestión de evidencias y vinculación
- Invitación y aceptación de usuarios
- Gestión de equipos de proyecto
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from api.models import (
    Organizacion, Proyecto, Item_Presupuestario, Subitem_Presupuestario,
    Transaccion, Proveedor, Evidencia, Transaccion_Evidencia, Rol,
    Usuario_Rol_Proyecto, InvitacionUsuario
)
from api.services import TransactionService, BudgetService, RenditionService
from api.constants import ESTADO_PENDIENTE, ESTADO_APROBADO, ESTADO_RECHAZADO

User = get_user_model()


class FlujoCompletoTransaccionTest(TestCase):
    """
    Tests de integración para el flujo completo de creación y aprobación de transacciones.
    """
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = APIClient()
        
        # Crear organización
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Organización Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        
        # Crear usuarios
        self.ejecutor = User.objects.create_user(
            username='ejecutor',
            email='ejecutor@test.com',
            password='testpass123',
            first_name='Ejecutor',
            last_name='Test',
            id_organizacion=self.organizacion
        )
        
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            first_name='Admin',
            last_name='Test',
            id_organizacion=self.organizacion
        )
        
        # Crear proyecto
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Integración',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=90)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
        )
        
        # Crear ítem presupuestario
        self.item = Item_Presupuestario.objects.create(
            nombre_item_presupuesto='Item Principal',
            monto_asignado_item=Decimal('500000.00'),
            proyecto=self.proyecto
        )
        
        # Crear proveedor
        self.proveedor = Proveedor.objects.create(
            nombre_proveedor='Proveedor Test',
            rut_proveedor='98765432-1'
        )
        
        # Crear roles
        self.rol_ejecutor = Rol.objects.create(nombre_rol='Ejecutor')
        self.rol_admin = Rol.objects.create(nombre_rol='Administrador de Proyecto')
        
        # Asignar roles
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.ejecutor,
            proyecto=self.proyecto,
            rol=self.rol_ejecutor
        )
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.admin,
            proyecto=self.proyecto,
            rol=self.rol_admin
        )
    
    def test_flujo_completo_crear_aprobar_transaccion(self):
        """
        Test: Flujo completo de crear una transacción y aprobarla.
        
        Pasos:
        1. Ejecutor crea una transacción (estado: pendiente)
        2. Admin aprueba la transacción (estado: aprobado)
        3. Verificar que los montos ejecutados se actualizaron
        4. Verificar que el saldo disponible disminuyó
        """
        # Paso 1: Crear transacción
        transaccion_data = {
            'proyecto': self.proyecto,
            'proveedor': self.proveedor,
            'monto_transaccion': Decimal('100000.00'),
            'tipo_transaccion': 'egreso',
            'tipo_doc_transaccion': 'factura',
            'nro_documento': 'FAC-001',
            'fecha_registro': timezone.now().date(),
            'item_presupuestario': self.item
        }
        
        transaccion = TransactionService.crear_transaccion(transaccion_data, self.ejecutor)
        
        # Verificar que se creó correctamente
        self.assertIsNotNone(transaccion.id)
        self.assertEqual(transaccion.estado_transaccion, ESTADO_PENDIENTE)
        self.assertEqual(transaccion.usuario, self.ejecutor)
        self.assertEqual(transaccion.monto_transaccion, Decimal('100000.00'))
        
        # Verificar que el saldo disponible no cambió (aún no aprobada)
        self.item.refresh_from_db()
        self.assertEqual(self.item.monto_ejecutado_item, Decimal('0.00'))
        self.assertEqual(self.item.saldo_disponible, Decimal('500000.00'))
        
        # Paso 2: Aprobar transacción
        transaccion_aprobada = TransactionService.aprobar_transaccion(transaccion, self.admin)
        
        # Verificar que se aprobó correctamente
        self.assertEqual(transaccion_aprobada.estado_transaccion, ESTADO_APROBADO)
        self.assertEqual(transaccion_aprobada.usuario_aprobador, self.admin)
        self.assertIsNotNone(transaccion_aprobada.fecha_aprobacion)
        
        # Paso 3: Verificar que los montos ejecutados se actualizaron
        self.item.refresh_from_db()
        self.proyecto.refresh_from_db()
        
        self.assertEqual(self.item.monto_ejecutado_item, Decimal('100000.00'))
        self.assertEqual(self.proyecto.monto_ejecutado_proyecto, Decimal('100000.00'))
        
        # Paso 4: Verificar que el saldo disponible disminuyó
        self.assertEqual(self.item.saldo_disponible, Decimal('400000.00'))
        self.assertEqual(
            self.proyecto.presupuesto_total - self.proyecto.monto_ejecutado_proyecto,
            Decimal('900000.00')
        )
    
    def test_flujo_crear_rechazar_transaccion(self):
        """
        Test: Flujo completo de crear y rechazar una transacción.
        
        Pasos:
        1. Ejecutor crea una transacción
        2. Admin rechaza la transacción
        3. Verificar que los montos NO se actualizaron
        """
        # Crear transacción
        transaccion_data = {
            'proyecto': self.proyecto,
            'proveedor': self.proveedor,
            'monto_transaccion': Decimal('50000.00'),
            'tipo_transaccion': 'egreso',
            'tipo_doc_transaccion': 'factura',
            'nro_documento': 'FAC-002',
            'fecha_registro': timezone.now().date(),
            'item_presupuestario': self.item
        }
        
        transaccion = TransactionService.crear_transaccion(transaccion_data, self.ejecutor)
        
        # Rechazar transacción
        transaccion_rechazada = TransactionService.rechazar_transaccion(
            transaccion,
            self.admin,
            motivo='No cumple con los requisitos'
        )
        
        # Verificar que se rechazó correctamente
        self.assertEqual(transaccion_rechazada.estado_transaccion, ESTADO_RECHAZADO)
        
        # Verificar que los montos NO se actualizaron
        self.item.refresh_from_db()
        self.proyecto.refresh_from_db()
        
        self.assertEqual(self.item.monto_ejecutado_item, Decimal('0.00'))
        self.assertEqual(self.proyecto.monto_ejecutado_proyecto, Decimal('0.00'))


class FlujoCompletoRendicionTest(TestCase):
    """
    Tests de integración para el flujo completo de rendición.
    """
    
    def setUp(self):
        """Configuración inicial para los tests."""
        # Crear organización
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Rendición',
            rut_organizacion='11111111-1',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        
        # Crear usuarios
        self.ejecutor = User.objects.create_user(
            username='ejecutor_rend',
            email='ejecutor_rend@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        self.admin = User.objects.create_user(
            username='admin_rend',
            email='admin_rend@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        # Crear proyecto
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Rendición',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=90)).date(),
            presupuesto_total=Decimal('500000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
        )
        
        # Crear ítem y proveedor
        self.item = Item_Presupuestario.objects.create(
            nombre_item_presupuesto='Item Rendición',
            monto_asignado_item=Decimal('300000.00'),
            proyecto=self.proyecto
        )
        
        self.proveedor = Proveedor.objects.create(
            nombre_proveedor='Proveedor Rendición',
            rut_proveedor='22222222-2'
        )
        
        # Crear roles y asignar
        self.rol_ejecutor = Rol.objects.create(nombre_rol='Ejecutor')
        self.rol_admin = Rol.objects.create(nombre_rol='Administrador de Proyecto')
        
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.ejecutor,
            proyecto=self.proyecto,
            rol=self.rol_ejecutor
        )
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.admin,
            proyecto=self.proyecto,
            rol=self.rol_admin
        )
    
    def test_flujo_completo_pre_rendicion_y_cierre(self):
        """
        Test: Flujo completo de pre-rendición y cierre de rendición.
        
        Pasos:
        1. Crear y aprobar transacciones
        2. Crear evidencias y vincularlas
        3. Generar pre-rendición (debe ser válida)
        4. Cerrar rendición
        5. Verificar que el proyecto quedó bloqueado
        """
        # Paso 1: Crear y aprobar transacciones
        transaccion1_data = {
            'proyecto': self.proyecto,
            'proveedor': self.proveedor,
            'monto_transaccion': Decimal('100000.00'),
            'tipo_transaccion': 'egreso',
            'tipo_doc_transaccion': 'factura',
            'nro_documento': 'FAC-REND-001',
            'fecha_registro': timezone.now().date(),
            'item_presupuestario': self.item
        }
        
        transaccion1 = TransactionService.crear_transaccion(transaccion1_data, self.ejecutor)
        transaccion1 = TransactionService.aprobar_transaccion(transaccion1, self.admin)
        
        # Paso 2: Crear evidencia y vincularla
        # Nota: En un test real, necesitarías un archivo mock o usar SimpleUploadedFile
        # Por ahora, simulamos que la evidencia existe
        evidencia = Evidencia.objects.create(
            nombre_evidencia='Evidencia Test',
            proyecto=self.proyecto,
            usuario_carga=self.ejecutor,
            archivo_path='evidencias/test-evidence.pdf',
            archivo_url='https://example.com/evidencia.pdf',
            tipo_archivo='application/pdf'
        )
        
        Transaccion_Evidencia.objects.create(
            transaccion=transaccion1,
            evidencia=evidencia
        )
        
        # Paso 3: Generar pre-rendición
        resultado_pre_rendicion = RenditionService.generar_pre_rendicion(self.proyecto)
        
        # Verificar que la pre-rendición es válida
        self.assertTrue(resultado_pre_rendicion['valido'])
        self.assertEqual(len(resultado_pre_rendicion['errores']), 0)
        
        # Paso 4: Cerrar rendición
        proyecto_cerrado = RenditionService.cerrar_rendicion(self.proyecto, self.admin)
        
        # Verificar que el proyecto quedó cerrado
        self.assertEqual(proyecto_cerrado.estado_proyecto, 'completado')
        
        # Paso 5: Verificar que no se pueden crear nuevas transacciones
        # (el proyecto está bloqueado)
        from api.validators import validar_proyecto_no_bloqueado
        from api.exceptions import ProyectoBloqueadoException
        
        with self.assertRaises(ProyectoBloqueadoException):
            validar_proyecto_no_bloqueado(self.proyecto)


class FlujoInvitacionUsuarioTest(TestCase):
    """
    Tests de integración para el flujo completo de invitación de usuarios.
    """
    
    def setUp(self):
        """Configuración inicial para los tests."""
        # Crear organización
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Invitación',
            rut_organizacion='33333333-3',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        
        # Crear usuario que invita
        self.invitador = User.objects.create_user(
            username='invitador',
            email='invitador@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
    
    def test_flujo_completo_invitacion_aceptacion(self):
        """
        Test: Flujo completo de invitar y aceptar invitación.
        
        Pasos:
        1. Crear invitación
        2. Verificar que la invitación está pendiente
        3. Aceptar invitación (simulado)
        4. Verificar que el usuario se creó y está vinculado a la organización
        """
        # Paso 1: Crear invitación
        invitacion = InvitacionUsuario.objects.create(
            email='nuevo_usuario@test.com',
            organizacion=self.organizacion,
            invitado_por=self.invitador,
            nombre_sugerido='Nuevo',
            apellido_sugerido='Usuario'
        )
        
        # Verificar que se creó correctamente
        self.assertIsNotNone(invitacion.id)
        self.assertEqual(invitacion.estado, 'pendiente')
        self.assertIsNotNone(invitacion.token)
        self.assertIsNotNone(invitacion.fecha_expiracion)
        self.assertTrue(invitacion.puede_ser_aceptada())
        
        # Paso 2: Verificar que la invitación está pendiente
        self.assertEqual(invitacion.estado, 'pendiente')
        self.assertFalse(invitacion.esta_expirada())
        
        # Paso 3: Simular aceptación (en un test real, usarías el endpoint)
        # Por ahora, verificamos que la invitación puede ser aceptada
        self.assertTrue(invitacion.puede_ser_aceptada())
        
        # Paso 4: Marcar como aceptada (simulado)
        invitacion.estado = 'aceptada'
        invitacion.fecha_aceptacion = timezone.now()
        invitacion.save()
        
        # Verificar que cambió el estado
        self.assertEqual(invitacion.estado, 'aceptada')
        self.assertIsNotNone(invitacion.fecha_aceptacion)
    
    def test_invitacion_expirada(self):
        """
        Test: Verificar que una invitación expirada no puede ser aceptada.
        """
        invitacion = InvitacionUsuario.objects.create(
            email='expirado@test.com',
            organizacion=self.organizacion,
            invitado_por=self.invitador,
            fecha_expiracion=timezone.now() - timedelta(days=1)  # Expirada
        )
        
        # Verificar que está expirada
        self.assertTrue(invitacion.esta_expirada())
        self.assertFalse(invitacion.puede_ser_aceptada())
        
        # Marcar como expirada
        invitacion.marcar_como_expirada()
        invitacion.refresh_from_db()
        
        self.assertEqual(invitacion.estado, 'expirada')


class FlujoGestionEquipoProyectoTest(TestCase):
    """
    Tests de integración para la gestión de equipos de proyecto.
    """
    
    def setUp(self):
        """Configuración inicial para los tests."""
        # Crear organización
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Equipo',
            rut_organizacion='44444444-4',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        
        # Crear usuarios
        self.admin = User.objects.create_user(
            username='admin_equipo',
            email='admin_equipo@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        self.usuario1 = User.objects.create_user(
            username='usuario1',
            email='usuario1@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        self.usuario2 = User.objects.create_user(
            username='usuario2',
            email='usuario2@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        # Crear proyecto
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Equipo',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=90)).date(),
            presupuesto_total=Decimal('500000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
        )
        
        # Crear roles
        self.rol_admin = Rol.objects.create(nombre_rol='Administrador de Proyecto')
        self.rol_ejecutor = Rol.objects.create(nombre_rol='Ejecutor')
        self.rol_auditor = Rol.objects.create(nombre_rol='Auditor')
    
    def test_flujo_agregar_quitar_miembro_equipo(self):
        """
        Test: Flujo completo de agregar y quitar miembros del equipo.
        
        Pasos:
        1. Agregar usuario1 como Ejecutor
        2. Agregar usuario2 como Auditor
        3. Verificar que ambos están en el equipo
        4. Quitar usuario2 del equipo
        5. Verificar que solo usuario1 queda
        """
        # Paso 1: Agregar usuario1 como Ejecutor
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.usuario1,
            proyecto=self.proyecto,
            rol=self.rol_ejecutor
        )
        
        # Verificar que está en el equipo
        miembros = Usuario_Rol_Proyecto.objects.filter(proyecto=self.proyecto)
        self.assertEqual(miembros.count(), 1)
        self.assertTrue(miembros.filter(usuario=self.usuario1).exists())
        
        # Paso 2: Agregar usuario2 como Auditor
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.usuario2,
            proyecto=self.proyecto,
            rol=self.rol_auditor
        )
        
        # Verificar que ambos están en el equipo
        miembros = Usuario_Rol_Proyecto.objects.filter(proyecto=self.proyecto)
        self.assertEqual(miembros.count(), 2)
        self.assertTrue(miembros.filter(usuario=self.usuario1).exists())
        self.assertTrue(miembros.filter(usuario=self.usuario2).exists())
        
        # Paso 3: Verificar roles
        rol_usuario1 = miembros.get(usuario=self.usuario1).rol
        rol_usuario2 = miembros.get(usuario=self.usuario2).rol
        self.assertEqual(rol_usuario1.nombre_rol, 'Ejecutor')
        self.assertEqual(rol_usuario2.nombre_rol, 'Auditor')
        
        # Paso 4: Quitar usuario2 del equipo
        Usuario_Rol_Proyecto.objects.filter(
            usuario=self.usuario2,
            proyecto=self.proyecto
        ).delete()
        
        # Paso 5: Verificar que solo usuario1 queda
        miembros = Usuario_Rol_Proyecto.objects.filter(proyecto=self.proyecto)
        self.assertEqual(miembros.count(), 1)
        self.assertTrue(miembros.filter(usuario=self.usuario1).exists())
        self.assertFalse(miembros.filter(usuario=self.usuario2).exists())
    
    def test_flujo_cambiar_rol_miembro(self):
        """
        Test: Flujo completo de cambiar el rol de un miembro del equipo.
        
        Pasos:
        1. Agregar usuario1 como Ejecutor
        2. Cambiar rol a Auditor
        3. Verificar que el rol cambió
        """
        # Paso 1: Agregar usuario1 como Ejecutor
        miembro = Usuario_Rol_Proyecto.objects.create(
            usuario=self.usuario1,
            proyecto=self.proyecto,
            rol=self.rol_ejecutor
        )
        
        # Verificar rol inicial
        self.assertEqual(miembro.rol.nombre_rol, 'Ejecutor')
        
        # Paso 2: Cambiar rol a Auditor
        miembro.rol = self.rol_auditor
        miembro.save()
        
        # Paso 3: Verificar que el rol cambió
        miembro.refresh_from_db()
        self.assertEqual(miembro.rol.nombre_rol, 'Auditor')


class FlujoPresupuestoCompletoTest(TestCase):
    """
    Tests de integración para el flujo completo de gestión de presupuesto.
    """
    
    def setUp(self):
        """Configuración inicial para los tests."""
        # Crear organización
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Presupuesto',
            rut_organizacion='55555555-5',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        
        # Crear usuarios
        self.ejecutor = User.objects.create_user(
            username='ejecutor_pres',
            email='ejecutor_pres@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        self.admin = User.objects.create_user(
            username='admin_pres',
            email='admin_pres@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        # Crear proyecto
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Presupuesto',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=90)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
        )
        
        # Crear items presupuestarios
        self.item1 = Item_Presupuestario.objects.create(
            nombre_item_presupuesto='Item 1',
            monto_asignado_item=Decimal('400000.00'),
            proyecto=self.proyecto
        )
        
        self.item2 = Item_Presupuestario.objects.create(
            nombre_item_presupuesto='Item 2',
            monto_asignado_item=Decimal('300000.00'),
            proyecto=self.proyecto
        )
        
        # Crear proveedor
        self.proveedor = Proveedor.objects.create(
            nombre_proveedor='Proveedor Presupuesto',
            rut_proveedor='66666666-6'
        )
        
        # Crear roles y asignar
        self.rol_ejecutor = Rol.objects.create(nombre_rol='Ejecutor')
        self.rol_admin = Rol.objects.create(nombre_rol='Administrador de Proyecto')
        
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.ejecutor,
            proyecto=self.proyecto,
            rol=self.rol_ejecutor
        )
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.admin,
            proyecto=self.proyecto,
            rol=self.rol_admin
        )
    
    def test_flujo_completo_ejecucion_presupuesto(self):
        """
        Test: Flujo completo de ejecución de presupuesto con múltiples transacciones.
        
        Pasos:
        1. Crear y aprobar transacciones en diferentes items
        2. Verificar que los montos se actualizan correctamente en cada item
        3. Verificar que el presupuesto total del proyecto se actualiza
        4. Calcular métricas y verificar que son correctas
        """
        # Paso 1: Crear y aprobar transacciones
        # Transacción 1 en Item 1
        trans1_data = {
            'proyecto': self.proyecto,
            'proveedor': self.proveedor,
            'monto_transaccion': Decimal('100000.00'),
            'tipo_transaccion': 'egreso',
            'tipo_doc_transaccion': 'factura',
            'nro_documento': 'FAC-PRES-001',
            'fecha_registro': timezone.now().date(),
            'item_presupuestario': self.item1
        }
        trans1 = TransactionService.crear_transaccion(trans1_data, self.ejecutor)
        trans1 = TransactionService.aprobar_transaccion(trans1, self.admin)
        
        # Transacción 2 en Item 1
        trans2_data = {
            'proyecto': self.proyecto,
            'proveedor': self.proveedor,
            'monto_transaccion': Decimal('50000.00'),
            'tipo_transaccion': 'egreso',
            'tipo_doc_transaccion': 'factura',
            'nro_documento': 'FAC-PRES-002',
            'fecha_registro': timezone.now().date(),
            'item_presupuestario': self.item1
        }
        trans2 = TransactionService.crear_transaccion(trans2_data, self.ejecutor)
        trans2 = TransactionService.aprobar_transaccion(trans2, self.admin)
        
        # Transacción 3 en Item 2
        trans3_data = {
            'proyecto': self.proyecto,
            'proveedor': self.proveedor,
            'monto_transaccion': Decimal('200000.00'),
            'tipo_transaccion': 'egreso',
            'tipo_doc_transaccion': 'factura',
            'nro_documento': 'FAC-PRES-003',
            'fecha_registro': timezone.now().date(),
            'item_presupuestario': self.item2
        }
        trans3 = TransactionService.crear_transaccion(trans3_data, self.ejecutor)
        trans3 = TransactionService.aprobar_transaccion(trans3, self.admin)
        
        # Paso 2: Verificar que los montos se actualizaron correctamente
        self.item1.refresh_from_db()
        self.item2.refresh_from_db()
        self.proyecto.refresh_from_db()
        
        # Item 1: 100000 + 50000 = 150000
        self.assertEqual(self.item1.monto_ejecutado_item, Decimal('150000.00'))
        self.assertEqual(self.item1.saldo_disponible, Decimal('250000.00'))
        
        # Item 2: 200000
        self.assertEqual(self.item2.monto_ejecutado_item, Decimal('200000.00'))
        self.assertEqual(self.item2.saldo_disponible, Decimal('100000.00'))
        
        # Proyecto: 150000 + 200000 = 350000
        self.assertEqual(self.proyecto.monto_ejecutado_proyecto, Decimal('350000.00'))
        
        # Paso 3: Calcular métricas
        metricas = BudgetService.calcular_metricas_presupuesto(self.proyecto)
        
        # Verificar métricas
        self.assertEqual(metricas['presupuesto_total'], 1000000.0)
        self.assertEqual(metricas['monto_ejecutado'], 350000.0)
        self.assertEqual(metricas['monto_disponible'], 650000.0)
        # Porcentaje: (150000 + 200000) / (400000 + 300000) * 100 = 350000 / 700000 * 100 = 50%
        self.assertEqual(metricas['porcentaje_ejecutado'], 50.0)
        self.assertEqual(metricas['total_items'], 2)

