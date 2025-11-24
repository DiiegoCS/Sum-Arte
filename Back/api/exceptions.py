"""
Custom exceptions for Sum-Arte API.

This module defines custom exception classes for better error handling
and consistent error messages throughout the application.
"""

from rest_framework.exceptions import APIException
from rest_framework import status


class SumArteException(APIException):
    """
    Base exception class for Sum-Arte API.
    
    All custom exceptions should inherit from this class.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Ha ocurrido un error en la operación."
    default_code = 'error'
    
    def __init__(self, detail=None, code=None, status_code=None):
        """
        Initialize the exception.
        
        Args:
            detail: Error message detail
            code: Error code
            status_code: HTTP status code
        """
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail, code)


class SaldoInsuficienteException(SumArteException):
    """
    Exception raised when there's insufficient budget balance.
    
    Control C001: Validar saldo disponible en ítem presupuestario
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "El ítem presupuestario no tiene saldo suficiente para esta transacción."
    default_code = 'saldo_insuficiente'


class TransaccionDuplicadaException(SumArteException):
    """
    Exception raised when a duplicate transaction is detected.
    
    Control C003: Control de duplicidad (proveedor + nro_documento)
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Ya existe una transacción con el mismo proveedor y número de documento."
    default_code = 'transaccion_duplicada'


class CategoriaNoCoincideException(SumArteException):
    """
    Exception raised when expense category doesn't match budget item category.
    
    Control C006: Validación categoría gasto vs ítem
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "La categoría del gasto no coincide con la categoría del ítem presupuestario."
    default_code = 'categoria_no_coincide'


class SinEvidenciaException(SumArteException):
    """
    Exception raised when transaction has no linked evidence.
    
    Control C002: Validar vinculación evidencia-transacción
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "La transacción debe tener al menos una evidencia vinculada."
    default_code = 'sin_evidencia'


class ProyectoBloqueadoException(SumArteException):
    """
    Exception raised when trying to modify a blocked project.
    
    Control C007: Validación tareas pendientes bloqueantes
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "El proyecto está bloqueado para edición (en rendición o cerrado)."
    default_code = 'proyecto_bloqueado'


class TransaccionAprobadaException(SumArteException):
    """
    Exception raised when trying to modify an approved/rejected transaction.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "No se puede modificar una transacción que ya ha sido aprobada o rechazada."
    default_code = 'transaccion_aprobada'


class SegregacionFuncionesException(SumArteException):
    """
    Exception raised when segregation of duties is violated.
    
    A user cannot approve a transaction they created.
    """
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "No se puede aprobar una transacción creada por el mismo usuario."
    default_code = 'segregacion_funciones'


class RendicionIncompletaException(SumArteException):
    """
    Exception raised when trying to close a rendition with incomplete data.
    
    Control C008: Revisión integridad pre-rendición
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "No se puede cerrar la rendición. Hay transacciones pendientes o sin evidencia."
    default_code = 'rendicion_incompleta'

