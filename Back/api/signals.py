"""
Señales de Django para logging automático en Sum-Arte.

Este módulo implementa signals para registrar automáticamente todas las acciones
importantes en el sistema, cumpliendo con el control C005 (Trazabilidad).
"""

from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import (
    Transaccion, Log_transaccion, Evidencia, Transaccion_Evidencia,
    ACCION_LOG_CREACION, ACCION_LOG_MODIFICACION, ACCION_LOG_DELETE,
    ACCION_LOG_APROBACION, ACCION_LOG_RECHAZO
)


@receiver(post_save, sender=Transaccion)
def log_transaccion_creacion_modificacion(sender, instance, created, **kwargs):
    """
    Registra automáticamente la creación o modificación de transacciones.
    
    Nota: La aprobación y rechazo se manejan en TransactionService,
    pero este signal captura cambios directos en el modelo.
    """
    # Obtener el usuario que realiza la acción
    # Si viene en kwargs (desde el servicio), usarlo; si no, intentar obtenerlo del request
    usuario = kwargs.get('usuario', None)
    
    # Si no hay usuario especificado, intentar obtenerlo del contexto
    if not usuario:
        # En algunos casos, el usuario puede estar en el contexto de la señal
        # Por ahora, usamos el usuario de la transacción si está disponible
        usuario = getattr(instance, '_usuario_accion', None) or instance.usuario
    
    if not usuario:
        # Si no hay usuario disponible, no registrar el log
        return
    
    if created:
        # La creación ya se maneja en TransactionService, pero registramos aquí como respaldo
        # Solo si no existe ya un log de creación
        if not Log_transaccion.objects.filter(
            transaccion=instance,
            accion_realizada=ACCION_LOG_CREACION
        ).exists():
            Log_transaccion.objects.create(
                transaccion=instance,
                usuario=usuario,
                accion_realizada=ACCION_LOG_CREACION
            )
    else:
        # Modificación: verificar si realmente hubo cambios
        # Solo registrar si el estado cambió o si hay cambios significativos
        if hasattr(instance, '_estado_anterior'):
            estado_anterior = instance._estado_anterior
            estado_actual = instance.estado_transaccion
            
            # Solo registrar si el estado cambió (y no es aprobación/rechazo, que ya se maneja en el servicio)
            if estado_anterior != estado_actual:
                # Aprobación y rechazo se manejan en TransactionService
                if estado_actual not in [ESTADO_APROBADO, ESTADO_RECHAZADO]:
                    Log_transaccion.objects.create(
                        transaccion=instance,
                        usuario=usuario,
                        accion_realizada=ACCION_LOG_MODIFICACION
                    )
        else:
            # Si no hay estado anterior registrado, asumir que es una modificación general
            # (pero solo si no es aprobación/rechazo)
            if instance.estado_transaccion not in [ESTADO_APROBADO, ESTADO_RECHAZADO]:
                # Verificar si ya existe un log reciente de modificación para evitar duplicados
                log_reciente = Log_transaccion.objects.filter(
                    transaccion=instance,
                    accion_realizada=ACCION_LOG_MODIFICACION,
                    fecha_hora_accion__gte=timezone.now() - timezone.timedelta(seconds=5)
                ).exists()
                
                if not log_reciente:
                    Log_transaccion.objects.create(
                        transaccion=instance,
                        usuario=usuario,
                        accion_realizada=ACCION_LOG_MODIFICACION
                    )


@receiver(pre_save, sender=Transaccion)
def capturar_estado_anterior(sender, instance, **kwargs):
    """
    Captura el estado anterior de la transacción antes de guardar.
    
    Esto permite detectar cambios de estado en el signal post_save.
    """
    if instance.pk:
        try:
            estado_anterior = Transaccion.objects.get(pk=instance.pk).estado_transaccion
            instance._estado_anterior = estado_anterior
        except Transaccion.DoesNotExist:
            instance._estado_anterior = None
    else:
        instance._estado_anterior = None


@receiver(post_delete, sender=Transaccion)
def log_transaccion_eliminacion(sender, instance, **kwargs):
    """
    Registra la eliminación de una transacción.
    
    Nota: En Sum-Arte, las transacciones generalmente no se eliminan,
    pero se registra por si acaso.
    
    IMPORTANTE: Este signal se ejecuta después de que la transacción se elimina,
    por lo que no podemos crear un Log_transaccion con una foreign key a la transacción
    eliminada. En su lugar, el log de eliminación debe crearse ANTES de eliminar
    la transacción, en el método destroy del ViewSet.
    """
    # No crear log aquí porque la transacción ya fue eliminada
    # El log de eliminación debe crearse en el ViewSet antes de eliminar
    pass


@receiver(post_save, sender=Evidencia)
def log_evidencia_creacion(sender, instance, created, **kwargs):
    """
    Registra la creación de evidencias.
    
    Las evidencias son importantes para la trazabilidad, especialmente
    cuando se vinculan a transacciones.
    """
    if created:
        # El log de evidencias podría almacenarse en un modelo separado
        # Por ahora, solo registramos en los logs de Django
        import logging
        logger = logging.getLogger('sumarte.auditoria')
        logger.info(
            f"Evidencia creada: ID={instance.id}, "
            f"Usuario={instance.usuario_carga.username if instance.usuario_carga else 'N/A'}, "
            f"Nombre={instance.nombre_evidencia}"
        )


@receiver(post_save, sender=Transaccion_Evidencia)
def log_vinculacion_evidencia(sender, instance, created, **kwargs):
    """
    Registra la vinculación de evidencias a transacciones.
    
    Esto es importante para la trazabilidad (C002, C005).
    """
    if created:
        import logging
        logger = logging.getLogger('sumarte.auditoria')
        logger.info(
            f"Evidencia vinculada a transacción: "
            f"Transacción ID={instance.transaccion.id}, "
            f"Evidencia ID={instance.evidencia.id}, "
            f"Nombre={instance.evidencia.nombre_evidencia}"
        )


@receiver(post_delete, sender=Transaccion_Evidencia)
def log_desvinculacion_evidencia(sender, instance, **kwargs):
    """
    Registra la desvinculación de evidencias de transacciones.
    """
    import logging
    logger = logging.getLogger('sumarte.auditoria')
    logger.info(
        f"Evidencia desvinculada de transacción: "
        f"Transacción ID={instance.transaccion.id}, "
        f"Evidencia ID={instance.evidencia.id}"
    )


# Importar constantes necesarias
from .constants import ESTADO_APROBADO, ESTADO_RECHAZADO

