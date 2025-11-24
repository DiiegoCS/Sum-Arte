"""
Excepciones personalizadas para la API de Sum-Arte.

Este módulo define las clases de excepciones personalizadas para un mejor manejo
de errores y mensajes de error consistentes en toda la aplicación.
"""

from rest_framework.exceptions import APIException
from rest_framework import status


class SumArteException(APIException):
    """
    Clase base de excepción para la API de Sum-Arte.
    
    Todas las excepciones personalizadas deben heredar de esta clase.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Ha ocurrido un error en la operación."
    default_code = 'error'
    
    def __init__(self, detail=None, code=None, status_code=None):
        """
        Inicializa la excepción.
        
        Args:
            detail: Detalle del mensaje de error
            code: Código de error
            status_code: Código de estado HTTP
        """
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail, code)


class SaldoInsuficienteException(SumArteException):
    """
    Se lanza cuando no hay saldo presupuestario suficiente.
    
    Control C001: Validar saldo disponible en ítem presupuestario
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "El ítem presupuestario no tiene saldo suficiente para esta transacción."
    default_code = 'saldo_insuficiente'


class TransaccionDuplicadaException(SumArteException):
    """
    Se lanza cuando se detecta una transacción duplicada.
    
    Control C003: Control de duplicidad (proveedor + nro_documento)
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Ya existe una transacción con el mismo proveedor y número de documento."
    default_code = 'transaccion_duplicada'


class CategoriaNoCoincideException(SumArteException):
    """
    Se lanza cuando la categoría del gasto no coincide con la del ítem presupuestario.
    
    Control C006: Validación categoría gasto vs ítem
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "La categoría del gasto no coincide con la categoría del ítem presupuestario."
    default_code = 'categoria_no_coincide'


class SinEvidenciaException(SumArteException):
    """
    Se lanza cuando la transacción no tiene vinculada evidencia.
    
    Control C002: Validar vinculación evidencia-transacción
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "La transacción debe tener al menos una evidencia vinculada."
    default_code = 'sin_evidencia'


class ProyectoBloqueadoException(SumArteException):
    """
    Se lanza cuando se intenta modificar un proyecto bloqueado.
    
    Control C007: Validación tareas pendientes bloqueantes
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "El proyecto está bloqueado para edición (en rendición o cerrado)."
    default_code = 'proyecto_bloqueado'


class TransaccionAprobadaException(SumArteException):
    """
    Se lanza cuando se intenta modificar una transacción ya aprobada o rechazada.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "No se puede modificar una transacción que ya ha sido aprobada o rechazada."
    default_code = 'transaccion_aprobada'


class SegregacionFuncionesException(SumArteException):
    """
    Se lanza cuando se viola la segregación de funciones.
    
    Un usuario no puede aprobar una transacción que ha creado.
    """
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "No se puede aprobar una transacción creada por el mismo usuario."
    default_code = 'segregacion_funciones'


class RendicionIncompletaException(SumArteException):
    """
    Se lanza cuando se intenta cerrar una rendición con datos incompletos.
    
    Control C008: Revisión integridad pre-rendición
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "No se puede cerrar la rendición. Hay transacciones pendientes o sin evidencia."
    default_code = 'rendicion_incompleta'


