"""
Capa de servicios para la API de Sum-Arte.

Este módulo contiene los servicios de lógica de negocio relacionados
con operaciones complejas como la aprobación de transacciones, manejo
de presupuesto y generación de rendiciones.
"""

from django.db import transaction as db_transaction
from django.utils import timezone
from django.db.models import Sum, Q, F
from django.core.exceptions import ValidationError
from .models import (
    Transaccion, Item_Presupuestario, Subitem_Presupuestario,
    Proyecto, Log_transaccion, Evidencia, Transaccion_Evidencia,
    ACCION_LOG_APROBACION, ACCION_LOG_RECHAZO, ACCION_LOG_CREACION
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
    ESTADO_PENDIENTE, ESTADO_APROBADO, ESTADO_RECHAZADO
)


class TransactionService:
    """
    Clase de servicio para operaciones relacionadas con transacciones.
    
    Se encarga de la creación, aprobación, rechazo de transacciones y actualización de presupuesto.
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
        # Se valida que el proyecto no esté bloqueado
        proyecto = transaccion_data['proyecto']
        validar_proyecto_no_bloqueado(proyecto)
        
        # Se valida la duplicidad (C003)
        validar_duplicidad(
            transaccion_data['proveedor'],
            transaccion_data['nro_documento']
        )
        
        # Se valida el cumplimiento normativo (C011)
        transaccion = Transaccion(**transaccion_data)
        transaccion.usuario = usuario
        transaccion.estado_transaccion = ESTADO_PENDIENTE
        validar_cumplimiento_normativo(transaccion)
        
        # Si es un egreso, se valida el saldo disponible (C001)
        if transaccion.tipo_transaccion == 'egreso':
            item = transaccion.item_presupuestario
            subitem = transaccion.subitem_presupuestario
            
            if subitem:
                validar_saldo_disponible(transaccion, subitem_presupuestario=subitem)
            elif item:
                validar_saldo_disponible(transaccion, item_presupuestario=item)
            else:
                raise ValidationError("Las transacciones de egreso deben estar asociadas a un ítem presupuestario.")
            
            # Se valida la categoría (C006)
            if item and transaccion.categoria_gasto:
                validar_categoria_gasto(transaccion, item)
        
        # Se guarda la transacción
        transaccion.save()
        
        # Se registra el log de creación (C005)
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
        # Se valida que se pueda aprobar la transacción
        if not transaccion.puede_aprobar(usuario_aprobador):
            if transaccion.usuario == usuario_aprobador:
                raise SegregacionFuncionesException()
            if transaccion.estado_transaccion != ESTADO_PENDIENTE:
                raise TransaccionAprobadaException()
        
        # Se valida que el proyecto no se encuentre bloqueado
        validar_proyecto_no_bloqueado(transaccion.proyecto)
        
        # Si es un egreso, se valida el saldo disponible (C001)
        if transaccion.tipo_transaccion == 'egreso':
            if transaccion.subitem_presupuestario:
                validar_saldo_disponible(transaccion, subitem_presupuestario=transaccion.subitem_presupuestario)
            elif transaccion.item_presupuestario:
                validar_saldo_disponible(transaccion, item_presupuestario=transaccion.item_presupuestario)
            
            # Se valida la categoría (C006)
            if transaccion.item_presupuestario and transaccion.categoria_gasto:
                validar_categoria_gasto(transaccion, transaccion.item_presupuestario)
        
        # Se valida el cumplimiento normativo (C011)
        validar_cumplimiento_normativo(transaccion)
        
        # Se actualiza el estado de la transacción a "aprobado"
        transaccion.estado_transaccion = ESTADO_APROBADO
        transaccion.fecha_aprobacion = timezone.now()
        transaccion.usuario_aprobador = usuario_aprobador
        transaccion.save()
        
        # Se actualizan los montos ejecutados en el presupuesto asociado
        BudgetService.actualizar_montos_ejecutados(transaccion)
        
        # Se registra el log de aprobación (C005)
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
        
        # Se actualiza el estado de la transacción a "rechazado"
        transaccion.estado_transaccion = ESTADO_RECHAZADO
        transaccion.save()
        
        # Se registra el log de rechazo (C005)
        Log_transaccion.objects.create(
            transaccion=transaccion,
            usuario=usuario_rechazador,
            accion_realizada=ACCION_LOG_RECHAZO
        )
        
        return transaccion


class BudgetService:
    """
    Clase de servicio para operaciones relacionadas con el presupuesto.
    
    Se encarga del cálculo y actualización de los montos del presupuesto.
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
        
        from decimal import Decimal
        # Asegurar que monto sea Decimal
        monto_decimal = Decimal(str(monto))
        
        # Se actualiza el subítem si existe
        if transaccion.subitem_presupuestario:
            subitem = transaccion.subitem_presupuestario
            subitem.monto_ejecutado_subitem = Decimal(str(subitem.monto_ejecutado_subitem)) + monto_decimal
            subitem.save()
            
            # Se actualiza el ítem padre
            item = subitem.item_presupuesto
            item.monto_ejecutado_item = Decimal(str(item.monto_ejecutado_item)) + monto_decimal
            item.save()
        elif transaccion.item_presupuestario:
            # Se actualiza sólo el ítem
            item = transaccion.item_presupuestario
            item.monto_ejecutado_item = Decimal(str(item.monto_ejecutado_item)) + monto_decimal
            item.save()
        
        # Se actualiza el monto ejecutado del proyecto
        proyecto = transaccion.proyecto
        if transaccion.tipo_transaccion == 'egreso':
            proyecto.monto_ejecutado_proyecto = Decimal(str(proyecto.monto_ejecutado_proyecto)) + monto_decimal
        else:  # Si es ingreso
            proyecto.presupuesto_total = Decimal(str(proyecto.presupuesto_total)) + monto_decimal
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
        
        from decimal import Decimal
        total_asignado = sum(Decimal(str(item.monto_asignado_item)) for item in items)
        total_ejecutado = sum(Decimal(str(item.monto_ejecutado_item)) for item in items)
        porcentaje_ejecutado = float((total_ejecutado / total_asignado * 100)) if total_asignado > 0 else 0
        
        presupuesto_total = Decimal(str(proyecto.presupuesto_total))
        monto_ejecutado = Decimal(str(proyecto.monto_ejecutado_proyecto))
        
        return {
            'presupuesto_total': float(presupuesto_total),
            'monto_ejecutado': float(monto_ejecutado),
            'monto_disponible': float(presupuesto_total - monto_ejecutado),
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
    Clase de servicio para operaciones relacionadas con las rendiciones.
    
    Se encarga de la validación previa a la rendición y del cierre de rendiciones.
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
            # Se retornan los errores encontrados sin lanzar excepción
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
        # Se valida la integridad de la rendición (C008)
        resultado = validar_integridad_pre_rendicion(proyecto)
        
        if not resultado['valido']:
            raise RendicionIncompletaException(
                detail="; ".join(resultado['errores'])
            )
        
        # Se cambia el estado del proyecto a 'completado' o 'cerrado'
        # (esto depende de la lógica de negocio establecida)
        proyecto.estado_proyecto = 'completado'
        proyecto.save()
        
        # Las transacciones quedan bloqueadas para edición porque el proyecto se encuentra bloqueado
        # (esta validación se realiza en validar_proyecto_no_bloqueado)
        
        return proyecto

