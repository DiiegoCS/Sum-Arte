"""
Tests para la funcionalidad de editar y eliminar transacciones.

Incluye tests para:
- Permisos de edición/eliminación (solo admin proyecto)
- Validaciones de estado (solo pendientes se pueden editar)
- Reversión de montos al eliminar transacciones aprobadas
- Validaciones de proyecto bloqueado
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from api.models import (
    Organizacion, Proyecto, Item_Presupuestario, Transaccion, Proveedor,
    Rol, Usuario_Rol_Proyecto
)
from api.constants import ESTADO_PENDIENTE, ESTADO_APROBADO, ESTADO_RECHAZADO

User = get_user_model()


class EditarEliminarTransaccionTest(TestCase):
    """Tests para editar y eliminar transacciones."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = APIClient()
        
        # Crear organización
        self.organizacion = Organizacion.objects.create(
            nombre_organizacion='Org Test',
            rut_organizacion='12345678-9',
            plan_suscripcion='basico',
            fecha_inicio_suscripcion=timezone.now().date()
        )
        
        # Crear usuarios
        self.ejecutor = User.objects.create_user(
            username='ejecutor',
            email='ejecutor@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            id_organizacion=self.organizacion
        )
        
        # Crear proyecto
        self.proyecto = Proyecto.objects.create(
            nombre_proyecto='Proyecto Test',
            fecha_inicio_proyecto=timezone.now().date(),
            fecha_fin_proyecto=(timezone.now() + timedelta(days=90)).date(),
            presupuesto_total=Decimal('1000000.00'),
            id_organizacion=self.organizacion,
            estado_proyecto='activo'
        )
        
        # Crear ítem y proveedor
        self.item = Item_Presupuestario.objects.create(
            nombre_item_presupuesto='Item Test',
            monto_asignado_item=Decimal('500000.00'),
            proyecto=self.proyecto
        )
        
        self.proveedor = Proveedor.objects.create(
            nombre_proveedor='Proveedor Test',
            rut_proveedor='98765432-1'
        )
        
        # Crear roles (usar las constantes del modelo)
        from api.models import ROL_ADMIN_PRYECTO, ROL_EJECUTOR
        self.rol_ejecutor = Rol.objects.create(nombre_rol=ROL_EJECUTOR)
        self.rol_admin = Rol.objects.create(nombre_rol=ROL_ADMIN_PRYECTO)
        
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
        
        # Crear transacción pendiente
        self.transaccion_pendiente = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=self.proveedor,
            usuario=self.ejecutor,
            monto_transaccion=Decimal('100000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_PENDIENTE,
            tipo_doc_transaccion='factura',
            nro_documento='FAC-001',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
    
    def test_admin_puede_editar_transaccion_pendiente(self):
        """Test: Un admin de proyecto puede editar una transacción pendiente."""
        self.client.force_authenticate(user=self.admin)
        
        datos_actualizados = {
            'monto_transaccion': '150000.00',
            'nro_documento': 'FAC-001-ACTUALIZADO'
        }
        
        response = self.client.patch(
            f'/api/transacciones/{self.transaccion_pendiente.id}/',
            data=datos_actualizados,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.transaccion_pendiente.refresh_from_db()
        self.assertEqual(self.transaccion_pendiente.monto_transaccion, Decimal('150000.00'))
        self.assertEqual(self.transaccion_pendiente.nro_documento, 'FAC-001-ACTUALIZADO')
    
    def test_ejecutor_no_puede_editar_transaccion(self):
        """Test: Un ejecutor NO puede editar una transacción."""
        self.client.force_authenticate(user=self.ejecutor)
        
        datos_actualizados = {
            'monto_transaccion': '150000.00'
        }
        
        response = self.client.patch(
            f'/api/transacciones/{self.transaccion_pendiente.id}/',
            data=datos_actualizados,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_no_se_puede_editar_transaccion_aprobada(self):
        """Test: No se puede editar una transacción aprobada."""
        from api.services import TransactionService
        
        # Aprobar la transacción
        TransactionService.aprobar_transaccion(self.transaccion_pendiente, self.admin)
        
        self.client.force_authenticate(user=self.admin)
        
        datos_actualizados = {
            'monto_transaccion': '150000.00'
        }
        
        response = self.client.patch(
            f'/api/transacciones/{self.transaccion_pendiente.id}/',
            data=datos_actualizados,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('aprobada', response.data.get('error', '').lower())
    
    def test_admin_puede_eliminar_transaccion_pendiente(self):
        """Test: Un admin puede eliminar una transacción pendiente."""
        self.client.force_authenticate(user=self.admin)
        
        transaccion_id = self.transaccion_pendiente.id
        
        response = self.client.delete(f'/api/transacciones/{transaccion_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Transaccion.objects.filter(id=transaccion_id).exists())
    
    def test_ejecutor_no_puede_eliminar_transaccion(self):
        """Test: Un ejecutor NO puede eliminar una transacción."""
        self.client.force_authenticate(user=self.ejecutor)
        
        transaccion_id = self.transaccion_pendiente.id
        
        response = self.client.delete(f'/api/transacciones/{transaccion_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Transaccion.objects.filter(id=transaccion_id).exists())
    
    def test_eliminar_transaccion_aprobada_revierte_montos(self):
        """Test: Al eliminar una transacción aprobada, se revierten los montos ejecutados."""
        from api.services import TransactionService
        
        # Aprobar la transacción
        TransactionService.aprobar_transaccion(self.transaccion_pendiente, self.admin)
        
        # Verificar que los montos se actualizaron
        self.item.refresh_from_db()
        self.proyecto.refresh_from_db()
        self.assertEqual(self.item.monto_ejecutado_item, Decimal('100000.00'))
        self.assertEqual(self.proyecto.monto_ejecutado_proyecto, Decimal('100000.00'))
        
        # Eliminar la transacción
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/transacciones/{self.transaccion_pendiente.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verificar que los montos se revirtieron
        self.item.refresh_from_db()
        self.proyecto.refresh_from_db()
        self.assertEqual(self.item.monto_ejecutado_item, Decimal('0.00'))
        self.assertEqual(self.proyecto.monto_ejecutado_proyecto, Decimal('0.00'))
    
    def test_no_se_puede_eliminar_transaccion_de_proyecto_bloqueado(self):
        """Test: No se puede eliminar una transacción aprobada de un proyecto bloqueado."""
        from api.services import TransactionService
        
        # Aprobar la transacción
        TransactionService.aprobar_transaccion(self.transaccion_pendiente, self.admin)
        
        # Bloquear el proyecto
        self.proyecto.estado_proyecto = 'completado'
        self.proyecto.save()
        
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.delete(f'/api/transacciones/{self.transaccion_pendiente.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_msg = response.data.get('error', '').lower()
        self.assertTrue('completado' in error_msg or 'no permite ediciones' in error_msg or 'bloqueado' in error_msg)
    
    def test_no_se_puede_editar_transaccion_de_proyecto_bloqueado(self):
        """Test: No se puede editar una transacción de un proyecto bloqueado."""
        # Bloquear el proyecto
        self.proyecto.estado_proyecto = 'completado'
        self.proyecto.save()
        
        self.client.force_authenticate(user=self.admin)
        
        datos_actualizados = {
            'monto_transaccion': '150000.00'
        }
        
        response = self.client.patch(
            f'/api/transacciones/{self.transaccion_pendiente.id}/',
            data=datos_actualizados,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_msg = response.data.get('error', '').lower()
        self.assertTrue('completado' in error_msg or 'no permite ediciones' in error_msg or 'bloqueado' in error_msg)
    
    def test_validar_duplicidad_al_editar(self):
        """Test: Al editar, se valida que no haya duplicidad con otra transacción."""
        # Crear otra transacción con diferente proveedor
        otro_proveedor = Proveedor.objects.create(
            nombre_proveedor='Otro Proveedor',
            rut_proveedor='11111111-1'
        )
        
        otra_transaccion = Transaccion.objects.create(
            proyecto=self.proyecto,
            proveedor=otro_proveedor,
            usuario=self.ejecutor,
            monto_transaccion=Decimal('50000.00'),
            tipo_transaccion='egreso',
            estado_transaccion=ESTADO_PENDIENTE,
            tipo_doc_transaccion='factura',
            nro_documento='FAC-002',
            fecha_registro=timezone.now().date(),
            item_presupuestario=self.item
        )
        
        self.client.force_authenticate(user=self.admin)
        
        # Intentar editar para que tenga el mismo proveedor y documento que otra transacción
        datos_actualizados = {
            'proveedor': otro_proveedor.id,
            'nro_documento': 'FAC-002'  # Mismo que otra_transaccion
        }
        
        response = self.client.patch(
            f'/api/transacciones/{self.transaccion_pendiente.id}/',
            data=datos_actualizados,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # El error puede estar en 'error' o en los campos del serializer
        error_msg = ''
        if 'error' in response.data:
            error_msg = str(response.data['error']).lower()
        elif 'non_field_errors' in response.data:
            error_msg = ' '.join([str(e) for e in response.data['non_field_errors']]).lower()
        elif 'proveedor' in response.data:
            error_msg = ' '.join([str(e) for e in response.data['proveedor']]).lower()
        elif 'nro_documento' in response.data:
            error_msg = ' '.join([str(e) for e in response.data['nro_documento']]).lower()
        else:
            # Si no encontramos el error, imprimir toda la respuesta para debug
            error_msg = str(response.data).lower()
        
        # El error puede ser "duplicada" o "único" (unique constraint)
        self.assertTrue(
            'duplicada' in error_msg or 'único' in error_msg or 'unique' in error_msg or 'conjunto único' in error_msg,
            f"Error message not found. Response data: {response.data}, error_msg: {error_msg}"
        )

