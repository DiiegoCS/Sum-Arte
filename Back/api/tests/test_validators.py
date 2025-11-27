"""
Tests unitarios para los validadores de controles de negocio (C001-C011).

Incluye tests para todas las validaciones de negocio implementadas.
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from api.models import (
    Organizacion, Usuario, Proyecto, Item_Presupuestario, Subitem_Presupuestario,
    Transaccion, Proveedor
)
from api.validators import (
    validar_saldo_disponible, validar_duplicidad, validar_categoria_gasto,
    validar_proyecto_no_bloqueado, validar_cumplimiento_normativo
)
from api.exceptions import (
    SaldoInsuficienteException, TransaccionDuplicadaException,
    CategoriaNoCoincideException, ProyectoBloqueadoException
)


class ValidarSaldoDisponibleTest(TestCase):
    """Tests para el validador C001: Validar saldo disponible."""
    
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
    
    def test_saldo_suficiente(self):
        """Test: No lanza excepción cuando hay saldo suficiente."""
        transaccion = Transaccion(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            item_presupuestario=self.item
        )
        
        # No debe lanzar excepción
        resultado = validar_saldo_disponible(transaccion, item_presupuestario=self.item)
        self.assertTrue(resultado)
    
    def test_saldo_insuficiente(self):
        """Test: Lanza excepción cuando no hay saldo suficiente."""
        transaccion = Transaccion(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('600000.00'),  # Mayor que el asignado
            tipo_transaccion='egreso',
            item_presupuestario=self.item
        )
        
        with self.assertRaises(SaldoInsuficienteException):
            validar_saldo_disponible(transaccion, item_presupuestario=self.item)
    
    def test_ingreso_no_requiere_saldo(self):
        """Test: Los ingresos no requieren validación de saldo."""
        transaccion = Transaccion(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='ingreso',
            item_presupuestario=self.item
        )
        
        # No debe lanzar excepción para ingresos
        resultado = validar_saldo_disponible(transaccion, item_presupuestario=self.item)
        self.assertTrue(resultado)


class ValidarDuplicidadTest(TestCase):
    """Tests para el validador C003: Control de duplicidad."""
    
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
    
    def test_no_duplicidad(self):
        """Test: No lanza excepción cuando no hay duplicidad."""
        resultado = validar_duplicidad(self.proveedor, 'DOC-001')
        self.assertTrue(resultado)
    
    def test_duplicidad_detectada(self):
        """Test: Lanza excepción cuando hay duplicidad."""
        # Crear primera transacción
        Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion='pendiente',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date()
        )
        
        # Intentar crear otra con mismo proveedor y documento
        with self.assertRaises(TransaccionDuplicadaException):
            validar_duplicidad(self.proveedor, 'DOC-001')


class ValidarProyectoNoBloqueadoTest(TestCase):
    """Tests para el validador C007: Validación tareas pendientes bloqueantes."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        self.proyecto_activo = Proyecto.objects.create(
            nombre_proyecto='Proyecto Activo',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=30)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
        )
        self.proyecto_completado = Proyecto.objects.create(
            nombre_proyecto='Proyecto Completado',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=30)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='completado'
        )
    
    def test_proyecto_activo_permitido(self):
        """Test: No lanza excepción para proyectos activos."""
        resultado = validar_proyecto_no_bloqueado(self.proyecto_activo)
        self.assertTrue(resultado)
    
    def test_proyecto_completado_bloqueado(self):
        """Test: Lanza excepción para proyectos completados."""
        with self.assertRaises(ProyectoBloqueadoException):
            validar_proyecto_no_bloqueado(self.proyecto_completado)


class ValidarCumplimientoNormativoTest(TestCase):
    """Tests para el validador C011: Validación cumplimiento normativo."""
    
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
    
    def test_transaccion_valida(self):
        """Test: No lanza excepción para transacciones válidas."""
        transaccion = Transaccion(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date()
        )
        
        resultado = validar_cumplimiento_normativo(transaccion)
        self.assertTrue(resultado)
    
    def test_monto_cero_invalido(self):
        """Test: Lanza excepción para monto cero o negativo."""
        transaccion = Transaccion(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('0.00'),
            tipo_transaccion='egreso',
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=timezone.now().date()
        )
        
        with self.assertRaises(ValidationError):
            validar_cumplimiento_normativo(transaccion)
    
    def test_fecha_futura_invalida(self):
        """Test: Lanza excepción para fecha de registro futura."""
        transaccion = Transaccion(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.usuario,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            tipo_doc_transaccion='factura',
            nro_documento='DOC-001',
            fecha_registro=(timezone.now() + timedelta(days=1)).date()
        )
        
        with self.assertRaises(ValidationError):
            validar_cumplimiento_normativo(transaccion)


