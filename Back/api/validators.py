"""
Validators for Sum-Arte API business controls.

This module implements all business control validations (C001-C011)
as specified in the project documentation.
"""

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from .models import Transaccion, Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Proyecto
from .exceptions import (
    SaldoInsuficienteException,
    TransaccionDuplicadaException,
    CategoriaNoCoincideException,
    SinEvidenciaException,
    ProyectoBloqueadoException,
    RendicionIncompletaException
)
from .constants import (
    CONTROL_C001, CONTROL_C002, CONTROL_C003, CONTROL_C004, CONTROL_C005,
    CONTROL_C006, CONTROL_C007, CONTROL_C008, CONTROL_C010, CONTROL_C011
)


def validar_saldo_disponible(transaccion, item_presupuestario=None, subitem_presupuestario=None):
    """
    Control C001: Validar saldo disponible en ítem presupuestario.
    
    Verifica que el ítem o subítem presupuestario tenga saldo suficiente
    para la transacción.
    
    Args:
        transaccion: Instancia de Transaccion a validar
        item_presupuestario: Item_Presupuestario asociado (opcional)
        subitem_presupuestario: Subitem_Presupuestario asociado (opcional)
        
    Raises:
        SaldoInsuficienteException: Si no hay saldo suficiente
    """
    if transaccion.tipo_transaccion == 'ingreso':
        # Los ingresos no requieren validación de saldo
        return True
    
    # Determinar qué ítem validar
    item_a_validar = subitem_presupuestario if subitem_presupuestario else item_presupuestario
    
    if not item_a_validar:
        # Si no hay ítem asociado, no se puede validar
        raise ValidationError("La transacción debe estar asociada a un ítem presupuestario.")
    
    if not item_a_validar.tiene_saldo_suficiente(transaccion.monto_transaccion):
        raise SaldoInsuficienteException(
            detail=f"El {'subítem' if subitem_presupuestario else 'ítem'} presupuestario "
                   f"'{item_a_validar.nombre_item_presupuesto if hasattr(item_a_validar, 'nombre_item_presupuesto') else item_a_validar.nombre_subitem_presupuesto}' "
                   f"no tiene saldo suficiente. Saldo disponible: ${item_a_validar.saldo_disponible}, "
                   f"Monto requerido: ${transaccion.monto_transaccion}"
        )
    
    return True


def validar_vinculacion_evidencia(transaccion):
    """
    Control C002: Validar vinculación evidencia-transacción.
    
    Verifica que la transacción tenga al menos una evidencia vinculada.
    
    Args:
        transaccion: Instancia de Transaccion a validar
        
    Raises:
        SinEvidenciaException: Si no hay evidencias vinculadas
    """
    evidencias = Transaccion_Evidencia.objects.filter(transaccion=transaccion)
    evidencias_activas = evidencias.filter(evidencia__eliminado=False)
    
    if not evidencias_activas.exists():
        raise SinEvidenciaException(
            detail="La transacción debe tener al menos una evidencia vinculada y activa."
        )
    
    return True


def validar_duplicidad(proveedor, nro_documento, transaccion_id=None):
    """
    Control C003: Control de duplicidad (proveedor + nro_documento).
    
    Verifica que no exista otra transacción con el mismo proveedor
    y número de documento.
    
    Args:
        proveedor: Instancia de Proveedor
        nro_documento: Número de documento
        transaccion_id: ID de la transacción actual (para excluir en updates)
        
    Raises:
        TransaccionDuplicadaException: Si existe una transacción duplicada
    """
    queryset = Transaccion.objects.filter(
        proveedor=proveedor,
        nro_documento=nro_documento
    )
    
    # Excluir la transacción actual si es una actualización
    if transaccion_id:
        queryset = queryset.exclude(id=transaccion_id)
    
    if queryset.exists():
        transaccion_existente = queryset.first()
        raise TransaccionDuplicadaException(
            detail=f"Ya existe una transacción con el mismo proveedor y número de documento. "
                   f"Transacción ID: {transaccion_existente.id}, Proyecto: {transaccion_existente.proyecto.nombre_proyecto}"
        )
    
    return True


def validar_datos_conciliacion_bancaria(transaccion):
    """
    Control C004: Validación datos conciliación bancaria.
    
    Para transacciones de tipo ingreso, valida que existan los datos
    necesarios para la conciliación bancaria.
    
    Args:
        transaccion: Instancia de Transaccion a validar
        
    Raises:
        ValidationError: Si faltan datos de conciliación
    """
    if transaccion.tipo_transaccion == 'ingreso':
        if not transaccion.numero_cuenta_bancaria:
            raise ValidationError(
                "Las transacciones de ingreso deben incluir el número de cuenta bancaria para conciliación."
            )
        if not transaccion.numero_operacion_bancaria:
            raise ValidationError(
                "Las transacciones de ingreso deben incluir el número de operación bancaria para conciliación."
            )
    
    return True


def validar_categoria_gasto(transaccion, item_presupuestario):
    """
    Control C006: Validación categoría gasto vs ítem.
    
    Verifica que la categoría del gasto coincida con la categoría
    del ítem presupuestario.
    
    Args:
        transaccion: Instancia de Transaccion a validar
        item_presupuestario: Item_Presupuestario asociado
        
    Raises:
        CategoriaNoCoincideException: Si las categorías no coinciden
    """
    # Si el ítem no tiene categoría definida, no se valida
    if not item_presupuestario.categoria_item:
        return True
    
    # Si la transacción no tiene categoría, no se puede validar
    if not transaccion.categoria_gasto:
        raise CategoriaNoCoincideException(
            detail=f"La transacción debe tener una categoría de gasto. "
                   f"El ítem presupuestario requiere categoría: '{item_presupuestario.categoria_item}'"
        )
    
    # Comparar categorías (case-insensitive)
    if transaccion.categoria_gasto.lower() != item_presupuestario.categoria_item.lower():
        raise CategoriaNoCoincideException(
            detail=f"La categoría del gasto '{transaccion.categoria_gasto}' no coincide con "
                   f"la categoría del ítem presupuestario '{item_presupuestario.categoria_item}'"
        )
    
    return True


def validar_proyecto_no_bloqueado(proyecto):
    """
    Control C007: Validación tareas pendientes bloqueantes.
    
    Verifica que el proyecto no esté en un estado que bloquee ediciones.
    
    Args:
        proyecto: Instancia de Proyecto a validar
        
    Raises:
        ProyectoBloqueadoException: Si el proyecto está bloqueado
    """
    from .constants import ESTADOS_PROYECTO_BLOQUEADOS
    
    # Convertir estado a formato de constante si es necesario
    estado = proyecto.estado_proyecto
    
    # Estados que bloquean edición
    estados_bloqueados = ['en_rendicion', 'cerrado', 'completado']
    
    if estado in estados_bloqueados:
        raise ProyectoBloqueadoException(
            detail=f"El proyecto '{proyecto.nombre_proyecto}' está en estado '{proyecto.get_estado_proyecto_display()}' "
                   f"y no permite ediciones."
        )
    
    return True


def validar_integridad_pre_rendicion(proyecto):
    """
    Control C008: Revisión integridad pre-rendición.
    
    Verifica que todas las transacciones estén aprobadas y tengan evidencia
    antes de cerrar la rendición.
    
    Args:
        proyecto: Instancia de Proyecto a validar
        
    Returns:
        dict: Diccionario con errores y advertencias encontradas
        
    Raises:
        RendicionIncompletaException: Si hay errores críticos
    """
    errores = []
    advertencias = []
    
    # Obtener todas las transacciones del proyecto
    transacciones = Transaccion.objects.filter(proyecto=proyecto)
    
    # Verificar que todas las transacciones estén aprobadas
    transacciones_pendientes = transacciones.filter(estado_transaccion='pendiente')
    if transacciones_pendientes.exists():
        errores.append(
            f"Hay {transacciones_pendientes.count()} transacción(es) pendientes de aprobación."
        )
    
    transacciones_rechazadas = transacciones.filter(estado_transaccion='rechazado')
    if transacciones_rechazadas.exists():
        advertencias.append(
            f"Hay {transacciones_rechazadas.count()} transacción(es) rechazadas."
        )
    
    # Verificar que todas las transacciones aprobadas tengan evidencia
    transacciones_aprobadas = transacciones.filter(estado_transaccion='aprobado')
    transacciones_sin_evidencia = []
    
    for transaccion in transacciones_aprobadas:
        evidencias = Transaccion_Evidencia.objects.filter(
            transaccion=transaccion,
            evidencia__eliminado=False
        )
        if not evidencias.exists():
            transacciones_sin_evidencia.append(transaccion.id)
    
    if transacciones_sin_evidencia:
        errores.append(
            f"Las siguientes transacciones aprobadas no tienen evidencia vinculada: {transacciones_sin_evidencia}"
        )
    
    # Verificar reconciliación de presupuesto
    # (Suma de transacciones aprobadas debe coincidir con monto_ejecutado)
    monto_total_aprobado = transacciones_aprobadas.aggregate(
        total=Sum('monto_transaccion')
    )['total'] or 0
    
    if monto_total_aprobado != proyecto.monto_ejecutado_proyecto:
        advertencias.append(
            f"El monto ejecutado del proyecto ({proyecto.monto_ejecutado_proyecto}) "
            f"no coincide con la suma de transacciones aprobadas ({monto_total_aprobado})."
        )
    
    resultado = {
        'errores': errores,
        'advertencias': advertencias,
        'valido': len(errores) == 0
    }
    
    if errores:
        raise RendicionIncompletaException(
            detail="; ".join(errores)
        )
    
    return resultado


def validar_cumplimiento_normativo(transaccion):
    """
    Control C011: Validación cumplimiento normativo.
    
    Valida que la transacción cumpla con las normativas establecidas.
    Esto incluye validaciones de documentos, montos, fechas, etc.
    
    Args:
        transaccion: Instancia de Transaccion a validar
        
    Raises:
        ValidationError: Si no cumple con las normativas
    """
    # Validar que el documento tenga un tipo válido
    if not transaccion.tipo_doc_transaccion:
        raise ValidationError("La transacción debe tener un tipo de documento válido.")
    
    # Validar que el monto sea positivo
    if transaccion.monto_transaccion <= 0:
        raise ValidationError("El monto de la transacción debe ser mayor a cero.")
    
    # Validar que la fecha de registro no sea futura
    from django.utils import timezone
    if transaccion.fecha_registro > timezone.now().date():
        raise ValidationError("La fecha de registro no puede ser futura.")
    
    # Validar que el proveedor exista
    if not transaccion.proveedor:
        raise ValidationError("La transacción debe tener un proveedor asociado.")
    
    return True


def validar_almacenamiento_respaldo(evidencia):
    """
    Control C010: Almacenamiento con respaldo.
    
    Valida que la evidencia se almacene correctamente con respaldo.
    Esta validación se realiza principalmente a nivel de sistema de archivos,
    pero podemos validar que el archivo existe y es accesible.
    
    Args:
        evidencia: Instancia de Evidencia a validar
        
    Raises:
        ValidationError: Si hay problemas con el almacenamiento
    """
    if not evidencia.archivo_evidencia:
        raise ValidationError("La evidencia debe tener un archivo asociado.")
    
    # Verificar que el archivo existe
    if not evidencia.archivo_evidencia.storage.exists(evidencia.archivo_evidencia.name):
        raise ValidationError("El archivo de evidencia no se encuentra en el almacenamiento.")
    
    return True

