"""
Constants for Sum-Arte API.

This module contains all constant values used throughout the application,
including business control codes, error messages, and configuration values.
"""

# Business Control Codes (from documentation)
CONTROL_C001 = "C001"  # Validar saldo disponible en ítem presupuestario
CONTROL_C002 = "C002"  # Validar vinculación evidencia-transacción
CONTROL_C003 = "C003"  # Control de duplicidad (proveedor + nro_documento)
CONTROL_C004 = "C004"  # Validación datos conciliación bancaria
CONTROL_C005 = "C005"  # Trazabilidad (logging automático)
CONTROL_C006 = "C006"  # Validación categoría gasto vs ítem
CONTROL_C007 = "C007"  # Validación tareas pendientes bloqueantes
CONTROL_C008 = "C008"  # Revisión integridad pre-rendición
CONTROL_C009 = "C009"  # (To be determined)
CONTROL_C010 = "C010"  # Almacenamiento con respaldo
CONTROL_C011 = "C011"  # Validación cumplimiento normativo

# Error Messages (in Spanish)
ERROR_SALDO_INSUFICIENTE = "El ítem presupuestario no tiene saldo suficiente para esta transacción."
ERROR_DUPLICADO = "Ya existe una transacción con el mismo proveedor y número de documento."
ERROR_CATEGORIA_NO_COINCIDE = "La categoría del gasto no coincide con la categoría del ítem presupuestario."
ERROR_SIN_EVIDENCIA = "La transacción debe tener al menos una evidencia vinculada."
ERROR_PROYECTO_BLOQUEADO = "El proyecto está bloqueado para edición (en rendición o cerrado)."
ERROR_TRANSACCION_APROBADA = "No se puede modificar una transacción que ya ha sido aprobada o rechazada."
ERROR_SEGREGACION_FUNCIONES = "No se puede aprobar una transacción creada por el mismo usuario."
ERROR_SIN_APROBACION = "Todas las transacciones deben estar aprobadas antes de cerrar la rendición."
ERROR_FALTA_EVIDENCIA = "Todas las transacciones deben tener evidencia vinculada antes de cerrar la rendición."

# File Upload Configuration
ALLOWED_EVIDENCE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
    'application/vnd.ms-excel',  # .xls
    'application/msword',  # .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
]

MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Transaction States
ESTADO_PENDIENTE = 'pendiente'
ESTADO_APROBADO = 'aprobado'
ESTADO_RECHAZADO = 'rechazado'

# Transaction Types
TIPO_INGRESO = 'ingreso'
TIPO_EGRESO = 'egreso'

# Project States that block editing
ESTADOS_PROYECTO_BLOQUEADOS = ['en_rendicion', 'cerrado', 'completado']

