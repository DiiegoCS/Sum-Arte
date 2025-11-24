"""
Service layer for Sum-Arte API.

This module contains business logic services for complex operations
including transaction approval, budget management, and rendition generation.
"""

from django.db import transaction as db_transaction
from django.utils import timezone
from django.db.models import Sum, Q, F
from django.core.exceptions import ValidationError
from .models import (
    Transaccion, Item_Presupuestario, Subitem_Presupuestario,
    Proyecto, Log_transaccion, Evidencia, Transaccion_Evidencia
)
from .validators import (
    validar_saldo_disponible, validar_duplicidad, validar_categoria_gasto,
    validar_proyecto_no_bloqueado, validar_cumplimiento_normativo,
    validar_integridad_pre_rendicion
)
from .exceptions import (
    SaldoInsuficienteException, TransaccionDuplicadaException,
    CategoriaNoCoincideException, ProyectoBloqueadoException,
    SegregacionFuncionesException, TransaccionAprobadaException,
    RendicionIncompletaException
)
from .constants import (
    ESTADO_PENDIENTE, ESTADO_APROBADO, ESTADO_RECHAZADO,
    ACCION_LOG_APROBACION, ACCION_LOG_RECHAZO, ACCION_LOG_CREACION
)


class TransactionService:
    """
    Service class for transaction-related operations.
    
    Handles transaction creation, approval, rejection, and budget updates.
    """
    
    @staticmethod
    @db_transaction.atomic
    def crear_transaccion(transaccion_data, usuario):
        """
        Crea una nueva transacción en estado 'pendiente'.
        
        Args:
            transaccion_data: Diccionario con los datos de la transacción
            usuario: Usuario que crea la transacción
            
        Returns:
            Transaccion: Instancia de la transacción creada
            
        Raises:
            ValidationError: Si la validación falla
        """
        # Validar que el proyecto no esté bloqueado
        proyecto = transaccion_data['proyecto']
        validar_proyecto_no_bloqueado(proyecto)
        
        # Validar duplicidad (C003)
        validar_duplicidad(
            transaccion_data['proveedor'],
            transaccion_data['nro_documento']
        )
        
        # Validar cumplimiento normativo (C011)
        transaccion = Transaccion(**transaccion_data)
        transaccion.usuario = usuario
        transaccion.estado_transaccion = ESTADO_PENDIENTE
        validar_cumplimiento_normativo(transaccion)
        
        # Si es un egreso, validar saldo disponible (C001)
        if transaccion.tipo_transaccion == 'egreso':
            item = transaccion.item_presupuestario
            subitem = transaccion.subitem_presupuestario
            
            if subitem:
                validar_saldo_disponible(transaccion, subitem_presupuestario=subitem)
            elif item:
                validar_saldo_disponible(transaccion, item_presupuestario=item)
            else:
                raise ValidationError("Las transacciones de egreso deben estar asociadas a un ítem presupuestario.")
            
            # Validar categoría (C006)
            if item and transaccion.categoria_gasto:
                validar_categoria_gasto(transaccion, item)
        
        # Guardar la transacción
        transaccion.save()
        
        # Crear log de creación (C005)
        Log_transaccion.objects.create(
            transaccion=transaccion,
            usuario=usuario,
            accion_realizada=ACCION_LOG_CREACION
        )
        
        return transaccion
    
    @staticmethod
    @db_transaction.atomic
    def aprobar_transaccion(transaccion, usuario_aprobador):
        """
        Aprueba una transacción y actualiza los montos ejecutados.
        
        Args:
            transaccion: Instancia de Transaccion a aprobar
            usuario_aprobador: Usuario que aprueba la transacción
            
        Returns:
            Transaccion: Transacción aprobada
            
        Raises:
            SegregacionFuncionesException: Si el aprobador es el mismo que el creador
            TransaccionAprobadaException: Si la transacción ya está aprobada/rechazada
            SaldoInsuficienteException: Si no hay saldo suficiente
        """
        # Validar que se pueda aprobar
        if not transaccion.puede_aprobar(usuario_aprobador):
            if transaccion.usuario == usuario_aprobador:
                raise SegregacionFuncionesException()
            if transaccion.estado_transaccion != ESTADO_PENDIENTE:
                raise TransaccionAprobadaException()
        
        # Validar proyecto no bloqueado
        validar_proyecto_no_bloqueado(transaccion.proyecto)
        
        # Si es un egreso, validar saldo disponible (C001)
        if transaccion.tipo_transaccion == 'egreso':
            if transaccion.subitem_presupuestario:
                validar_saldo_disponible(transaccion, subitem_presupuestario=transaccion.subitem_presupuestario)
            elif transaccion.item_presupuestario:
                validar_saldo_disponible(transaccion, item_presupuestario=transaccion.item_presupuestario)
            
            # Validar categoría (C006)
            if transaccion.item_presupuestario and transaccion.categoria_gasto:
                validar_categoria_gasto(transaccion, transaccion.item_presupuestario)
        
        # Validar cumplimiento normativo (C011)
        validar_cumplimiento_normativo(transaccion)
        
        # Actualizar estado
        transaccion.estado_transaccion = ESTADO_APROBADO
        transaccion.fecha_aprobacion = timezone.now()
        transaccion.usuario_aprobador = usuario_aprobador
        transaccion.save()
        
        # Actualizar montos ejecutados
        BudgetService.actualizar_montos_ejecutados(transaccion)
        
        # Crear log de aprobación (C005)
        Log_transaccion.objects.create(
            transaccion=transaccion,
            usuario=usuario_aprobador,
            accion_realizada=ACCION_LOG_APROBACION
        )
        
        return transaccion
    
    @staticmethod
    @db_transaction.atomic
    def rechazar_transaccion(transaccion, usuario_rechazador, motivo=None):
        """
        Rechaza una transacción.
        
        Args:
            transaccion: Instancia de Transaccion a rechazar
            usuario_rechazador: Usuario que rechaza la transacción
            motivo: Motivo del rechazo (opcional)
            
        Returns:
            Transaccion: Transacción rechazada
            
        Raises:
            TransaccionAprobadaException: Si la transacción ya está aprobada/rechazada
        """
        if transaccion.estado_transaccion != ESTADO_PENDIENTE:
            raise TransaccionAprobadaException()
        
        # Actualizar estado
        transaccion.estado_transaccion = ESTADO_RECHAZADO
        transaccion.save()
        
        # Crear log de rechazo (C005)
        Log_transaccion.objects.create(
            transaccion=transaccion,
            usuario=usuario_rechazador,
            accion_realizada=ACCION_LOG_RECHAZO
        )
        
        return transaccion


class BudgetService:
    """
    Service class for budget-related operations.
    
    Handles budget calculations and updates.
    """
    
    @staticmethod
    @db_transaction.atomic
    def actualizar_montos_ejecutados(transaccion):
        """
        Actualiza los montos ejecutados del presupuesto cuando se aprueba una transacción.
        
        Args:
            transaccion: Transacción aprobada
        """
        monto = transaccion.monto_transaccion
        
        # Actualizar subítem si existe
        if transaccion.subitem_presupuestario:
            subitem = transaccion.subitem_presupuestario
            subitem.monto_ejecutado_subitem += monto
            subitem.save()
            
            # Actualizar ítem padre
            item = subitem.item_presupuesto
            item.monto_ejecutado_item += monto
            item.save()
        elif transaccion.item_presupuestario:
            # Actualizar solo el ítem
            item = transaccion.item_presupuestario
            item.monto_ejecutado_item += monto
            item.save()
        
        # Actualizar monto ejecutado del proyecto
        proyecto = transaccion.proyecto
        if transaccion.tipo_transaccion == 'egreso':
            proyecto.monto_ejecutado_proyecto += monto
        else:  # ingreso
            proyecto.presupuesto_total += monto
        proyecto.save()
    
    @staticmethod
    def calcular_metricas_presupuesto(proyecto):
        """
        Calcula métricas del presupuesto del proyecto.
        
        Args:
            proyecto: Instancia de Proyecto
            
        Returns:
            dict: Diccionario con métricas del presupuesto
        """
        items = Item_Presupuestario.objects.filter(proyecto=proyecto)
        
        total_asignado = sum(item.monto_asignado_item for item in items)
        total_ejecutado = sum(item.monto_ejecutado_item for item in items)
        porcentaje_ejecutado = (total_ejecutado / total_asignado * 100) if total_asignado > 0 else 0
        
        return {
            'presupuesto_total': float(proyecto.presupuesto_total),
            'monto_ejecutado': float(proyecto.monto_ejecutado_proyecto),
            'monto_disponible': float(proyecto.presupuesto_total - proyecto.monto_ejecutado_proyecto),
            'porcentaje_ejecutado': round(porcentaje_ejecutado, 2),
            'total_items': items.count(),
            'items_con_saldo': items.filter(
                monto_ejecutado_item__lt=F('monto_asignado_item')
            ).count()
        }
    
    @staticmethod
    def obtener_gastos_por_item(proyecto):
        """
        Obtiene el desglose de gastos por ítem presupuestario.
        
        Args:
            proyecto: Instancia de Proyecto
            
        Returns:
            list: Lista de diccionarios con información de cada ítem
        """
        items = Item_Presupuestario.objects.filter(proyecto=proyecto)
        resultado = []
        
        for item in items:
            transacciones_aprobadas = Transaccion.objects.filter(
                proyecto=proyecto,
                item_presupuestario=item,
                estado_transaccion=ESTADO_APROBADO,
                tipo_transaccion='egreso'
            )
            
            total_gastos = transacciones_aprobadas.aggregate(
                total=Sum('monto_transaccion')
            )['total'] or 0
            
            resultado.append({
                'item_id': item.id,
                'nombre': item.nombre_item_presupuesto,
                'monto_asignado': float(item.monto_asignado_item),
                'monto_ejecutado': float(item.monto_ejecutado_item),
                'saldo_disponible': float(item.saldo_disponible),
                'porcentaje_ejecutado': item.porcentaje_ejecutado(),
                'total_gastos': float(total_gastos),
                'cantidad_transacciones': transacciones_aprobadas.count()
            })
        
        return resultado


class RenditionService:
    """
    Service class for rendition-related operations.
    
    Handles pre-rendition validation and rendition closing.
    """
    
    @staticmethod
    def generar_pre_rendicion(proyecto):
        """
        Genera una pre-rendición con validaciones de integridad.
        
        Args:
            proyecto: Instancia de Proyecto
            
        Returns:
            dict: Diccionario con resultado de la validación
        """
        try:
            resultado = validar_integridad_pre_rendicion(proyecto)
            return resultado
        except RendicionIncompletaException as e:
            # Retornar los errores sin lanzar excepción
            return {
                'valido': False,
                'errores': [str(e.detail)],
                'advertencias': []
            }
    
    @staticmethod
    @db_transaction.atomic
    def cerrar_rendicion(proyecto, usuario):
        """
        Cierra la rendición del proyecto, bloqueando ediciones futuras.
        
        Args:
            proyecto: Instancia de Proyecto a cerrar
            usuario: Usuario que cierra la rendición
            
        Returns:
            Proyecto: Proyecto con rendición cerrada
            
        Raises:
            RendicionIncompletaException: Si hay errores en la validación
        """
        # Validar integridad (C008)
        resultado = validar_integridad_pre_rendicion(proyecto)
        
        if not resultado['valido']:
            raise RendicionIncompletaException(
                detail="; ".join(resultado['errores'])
            )
        
        # Cambiar estado del proyecto a 'completado' o 'cerrado'
        # (dependiendo de la lógica de negocio)
        proyecto.estado_proyecto = 'completado'
        proyecto.save()
        
        # Las transacciones ya no se pueden editar porque el proyecto está bloqueado
        # (esto se valida en validar_proyecto_no_bloqueado)
        
        return proyecto

