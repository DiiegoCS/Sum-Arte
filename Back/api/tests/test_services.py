"""
Tests unitarios para los servicios de negocio.

Incluye tests para TransactionService, BudgetService y RenditionService.
"""

from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from api.models import (
    Organizacion, Usuario, Proyecto, Item_Presupuestario, Subitem_Presupuestario,
    Transaccion, Proveedor, Rol, Usuario_Rol_Proyecto
)
from api.services import TransactionService, BudgetService, RenditionService
from api.exceptions import (
    SaldoInsuficienteException, TransaccionAprobadaException,
    SegregacionFuncionesException, RendicionIncompletaException
)
from api.constants import ESTADO_PENDIENTE, ESTADO_APROBADO, ESTADO_RECHAZADO


class TransactionServiceTest(TestCase):
    """Tests para TransactionService."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        self.usuario = Usuario.objects.create_user(
            username='ejecutor',
            email='ejecutor@example.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        self.aprobador = Usuario.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Test',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=30)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
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
        
        # Crear roles
        self.rol_ejecutor = Rol.objects.create(nombre_rol='Ejecutor')
        self.rol_admin = Rol.objects.create(nombre_rol='Administrador de Proyecto')
        
        # Asignar roles
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.usuario,
            proyecto=self.proyecto,
            rol=self.rol_ejecutor
        )
        Usuario_Rol_Proyecto.objects.create(
            usuario=self.aprobador,
            proyecto=self.proyecto,
            rol=self.rol_admin
        )
    
    def test_crear_transaccion(self):
        """Test: Se puede crear una transacción correctamente."""
        transaccion_data = {
            'proyecto': self.proyecto,
            'proveedor': self.proveedor,
            'monto_transaccion': Decimal('100000.00'),
            'tipo_transaccion': 'egreso',
            'tipo_doc_transaccion': 'factura',
            'nro_documento': 'DOC-001',
            'fecha_registro': timezone.now().date(),
            'item_presupuestario': self.item
        }
        
        transaccion = TransactionService.crear_transaccion(transaccion_data, self.usuario)
        
        self.assertIsNotNone(transaccion.id)
        self.assertEqual(transaccion.estado_transaccion, ESTADO_PENDIENTE)
        self.assertEqual(transaccion.usuario, self.usuario)
    
    def test_aprobar_transaccion(self):
        """Test: Se puede aprobar una transacción correctamente."""
        transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_PENDIENTE,
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        transaccion_aprobada = TransactionService.aprobar_transaccion(transaccion, self.aprobador)
        
        self.assertEqual(transaccion_aprobada.estado_transaccion, ESTADO_APROBADO)
        self.assertEqual(transaccion_aprobada.usuario_aprobador, self.aprobador)
        self.assertIsNotNone(transaccion_aprobada.fecha_aprobacion)
    
    def test_aprobar_transaccion_mismo_usuario(self):
        """Test: No se puede aprobar una transacción creada por el mismo usuario."""
        transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_PENDIENTE,
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        with self.assertRaises(SegregacionFuncionesException):
            TransactionService.aprobar_transaccion(transaccion, self.usuario)
    
    def test_rechazar_transaccion(self):
        """Test: Se puede rechazar una transacción correctamente."""
        transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_PENDIENTE,
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        transaccion_rechazada = TransactionService.rechazar_transaccion(
            transaccion, 
            self.aprobador, 
            motivo='No cumple con los requisitos'
        )
        
        self.assertEqual(transaccion_rechazada.estado_transaccion, ESTADO_RECHAZADO)


class BudgetServiceTest(TestCase):
    """Tests para BudgetService."""
    
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
        self.proveedor = Proveedor.objects.create(
            nombre_proveedor='Proveedor Test',
            rut_proveedor='98765432-1'
        )
        self.usuario = Usuario.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
    
    def test_actualizar_montos_ejecutados(self):
        """Test: Se actualizan correctamente los montos ejecutados."""
        transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_APROBADO,
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        # Actualizar montos
        BudgetService.actualizar_montos_ejecutados(transaccion)
        
        # Refrescar desde la BD
        self.item.refresh_from_db()
        self.proyecto.refresh_from_db()
        
        self.assertEqual(self.item.monto_ejecutado_item, Decimal('100000.00'))
        self.assertEqual(self.proyecto.monto_ejecutado_proyecto, Decimal('100000.00'))
    
    def test_calcular_metricas_presupuesto(self):
        """Test: Se calculan correctamente las métricas del presupuesto."""
        # Crear transacción aprobada
        Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('200000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_APROBADO,
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        # Actualizar montos
        self.item.monto_ejecutado_item = Decimal('200000.00')
        self.item.save()
        self.proyecto.monto_ejecutado_proyecto = Decimal('200000.00')
        self.proyecto.save()
        
        metricas = BudgetService.calcular_metricas_presupuesto(self.proyecto)
        
        self.assertEqual(metricas['presupuesto_total'], 1000000.0)
        self.assertEqual(metricas['monto_ejecutado'], 200000.0)
        self.assertEqual(metricas['monto_disponible'], 800000.0)
        # El porcentaje se calcula sobre el total de items asignados, no del presupuesto total del proyecto
        # Si solo hay un item con 500000 asignado y 200000 ejecutado, el porcentaje es 40%
        # (200000 / 500000 * 100 = 40%)
        self.assertEqual(metricas['porcentaje_ejecutado'], 40.0)


class RenditionServiceTest(TestCase):
    """Tests para RenditionService."""
    
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
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
        )
        self.usuario = Usuario.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
    
    def test_generar_pre_rendicion_proyecto_sin_transacciones(self):
        """Test: Genera pre-rendición para proyecto sin transacciones."""
        resultado = RenditionService.generar_pre_rendicion(self.proyecto)
        
        self.assertIsInstance(resultado, dict)
        self.assertIn('valido', resultado)
        self.assertIn('errores', resultado)
        self.assertIn('advertencias', resultado)
    
    def test_cerrar_rendicion_proyecto_incompleto(self):
        """Test: No se puede cerrar rendición si hay errores de validación."""
        # Proyecto sin transacciones aprobadas o con transacciones sin evidencias debería fallar
        # Crear una transacción pendiente sin evidencia
        proveedor = Proveedor.objects.create(
            nombre_proveedor='Proveedor Test',
            rut_proveedor='98765432-1'
        )
        transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_PENDIENTE,
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date()
        )
        
        # Intentar cerrar rendición debería fallar porque hay transacciones pendientes
        with self.assertRaises(RendicionIncompletaException):
            RenditionService.cerrar_rendicion(self.proyecto, self.usuario)


