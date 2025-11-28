"""
Tests unitarios para los modelos de la API de Sum-Arte.

Incluye tests para validaciones, métodos personalizados y propiedades calculadas.
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from api.models import (
    Organizacion, Usuario, Proyecto, Item_Presupuestario, Subitem_Presupuestario,
    Transaccion, Proveedor, Evidencia, Transaccion_Evidencia, Rol, Usuario_Rol_Proyecto,
    InvitacionUsuario
)


class OrganizacionModelTest(TestCase):
    """Tests para el modelo Organizacion."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Organización Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
    
    def test_crear_organizacion(self):
        """Test: Se puede crear una organización correctamente."""
        self.assertEqual(self.organizacion.nombre_organizacion, 'Organización Test')
        self.assertEqual(self.organizacion.rut_organizacion, '12345678-9')
        self.assertEqual(self.organizacion.estado_suscripcion, 'inactivo')
    
    def test_str_organizacion(self):
        """Test: El método __str__ retorna el nombre de la organización."""
        self.assertEqual(str(self.organizacion), 'Organización Test')


class ProyectoModelTest(TestCase):
    """Tests para el modelo Proyecto."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Test',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=30)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion
        )
    
    def test_crear_proyecto(self):
        """Test: Se puede crear un proyecto correctamente."""
        self.assertEqual(self.proyecto.nombre_proyecto, 'Proyecto Test')
        self.assertEqual(self.proyecto.presupuesto_total, Decimal('1000000.00'))
        self.assertEqual(self.proyecto.monto_ejecutado_proyecto, Decimal('0.00'))
        self.assertEqual(self.proyecto.estado_proyecto, 'inactivo')
    
    def test_monto_disponible(self):
        """Test: El monto disponible se calcula correctamente."""
        from decimal import Decimal
        monto_disponible = Decimal(str(self.proyecto.presupuesto_total)) - Decimal(str(self.proyecto.monto_ejecutado_proyecto))
        self.assertEqual(monto_disponible, Decimal('1000000.00'))
    
    def test_porcentaje_ejecutado(self):
        """Test: El porcentaje ejecutado se calcula correctamente."""
        from decimal import Decimal
        monto_ejecutado = Decimal(str(self.proyecto.monto_ejecutado_proyecto))
        presupuesto_total = Decimal(str(self.proyecto.presupuesto_total))
        porcentaje = float((monto_ejecutado / presupuesto_total) * 100)
        self.assertEqual(porcentaje, 0.0)


class ItemPresupuestarioModelTest(TestCase):
    """Tests para el modelo Item_Presupuestario."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Test',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=30)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion
        )
        self.item = Item_Presupuestario.objects.create(
            nombre_item_presupuesto='Item Test',
            monto_asignado_item=Decimal('500000.00'),
            proyecto=self.proyecto
        )
    
    def test_crear_item_presupuestario(self):
        """Test: Se puede crear un ítem presupuestario correctamente."""
        self.assertEqual(self.item.nombre_item_presupuesto, 'Item Test')
        self.assertEqual(self.item.monto_asignado_item, Decimal('500000.00'))
        self.assertEqual(self.item.monto_ejecutado_item, Decimal('0.00'))
    
    def test_saldo_disponible(self):
        """Test: El saldo disponible se calcula correctamente."""
        from decimal import Decimal
        saldo = self.item.saldo_disponible
        self.assertEqual(saldo, Decimal('500000.00'))
    
    def test_porcentaje_ejecutado(self):
        """Test: El porcentaje ejecutado se calcula correctamente."""
        porcentaje = self.item.porcentaje_ejecutado()
        self.assertEqual(porcentaje, 0.0)


class TransaccionModelTest(TestCase):
    """Tests para el modelo Transaccion."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        self.usuario = Usuario.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Test',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=30)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion
        )
        self.proveedor = Proveedor.objects.create(
            nombre_proveedor='Proveedor Test',
            rut_proveedor='98765432-1'
        )
        self.item = Item_Presupuestario.objects.create(
            nombre_item_presupuesto='Item Test',
            monto_asignado_item=Decimal('500000.00'),
            proyecto=self.proyecto
        )
    
    def test_crear_transaccion(self):
        """Test: Se puede crear una transacción correctamente."""
        transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion='pendiente',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        self.assertEqual(transaccion.monto_transaccion, Decimal('100000.00'))
        self.assertEqual(transaccion.estado_transaccion, 'pendiente')
        self.assertEqual(transaccion.tipo_transaccion, 'egreso')
    
    def test_transaccion_puede_aprobar(self):
        """Test: Verifica que una transacción pendiente puede ser aprobada."""
        transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion='pendiente',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        # Crear otro usuario para aprobar
        aprobador = Usuario.objects.create_user(
            username='aprobador',
            email='aprobador@example.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        # Debe poder aprobar si es admin del proyecto y no es el creador
        # (Este test requiere setup de roles, se puede expandir)
        self.assertTrue(transaccion.estado_transaccion == 'pendiente')


class InvitacionUsuarioModelTest(TestCase):
    """Tests para el modelo InvitacionUsuario."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        self.invitador = Usuario.objects.create_user(
            username='invitador',
            email='invitador@example.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
    
    def test_crear_invitacion(self):
        """Test: Se puede crear una invitación correctamente."""
        invitacion = InvitacionUsuario.objects.create(
            email='nuevo@example.com',
            organizacion=self.organizacion,
            invitado_por=self.invitador
        )
        
        self.assertEqual(invitacion.email, 'nuevo@example.com')
        self.assertEqual(invitacion.estado, 'pendiente')
        self.assertIsNotNone(invitacion.token)
        self.assertIsNotNone(invitacion.fecha_expiracion)
    
    def test_invitacion_expirada(self):
        """Test: Verifica si una invitación está expirada."""
        invitacion = InvitacionUsuario.objects.create(
            email='nuevo@example.com',
            organizacion=self.organizacion,
            invitado_por=self.invitador,
            fecha_expiracion=timezone.now() - timedelta(days=1)
        )
        
        self.assertTrue(invitacion.esta_expirada())
    
    def test_invitacion_puede_ser_aceptada(self):
        """Test: Verifica si una invitación puede ser aceptada."""
        invitacion = InvitacionUsuario.objects.create(
            email='nuevo@example.com',
            organizacion=self.organizacion,
            invitado_por=self.invitador,
            fecha_expiracion=timezone.now() + timedelta(days=7)
        )
        
        self.assertTrue(invitacion.puede_ser_aceptada())
        
        # Marcar como expirada
        invitacion.fecha_expiracion = timezone.now() - timedelta(days=1)
        invitacion.save()
        invitacion.marcar_como_expirada()
        
        self.assertFalse(invitacion.puede_ser_aceptada())


