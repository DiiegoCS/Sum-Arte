"""
Constantes para la API de Sum-Arte.

Este módulo contiene todos los valores constantes utilizados en la aplicación,
incluyendo códigos de control de negocio, mensajes de error y valores de configuración.
"""

# Códigos de control de negocio (según documentación)
CONTROL_C001 = "C001"  # Se valida el saldo disponible en el ítem presupuestario
CONTROL_C002 = "C002"  # Se valida la vinculación evidencia-transacción
CONTROL_C003 = "C003"  # Se controla duplicidad (proveedor + nro_documento)
CONTROL_C004 = "C004"  # Se valida datos de conciliación bancaria
CONTROL_C005 = "C005"  # Se registra trazabilidad (logging automático)
CONTROL_C006 = "C006"  # Se valida la categoría de gasto frente al ítem
CONTROL_C007 = "C007"  # Se validan tareas pendientes bloqueantes
CONTROL_C008 = "C008"  # Se revisa integridad antes de rendición
CONTROL_C009 = "C009"  # (Por determinar)
CONTROL_C010 = "C010"  # Se almacena con respaldo
CONTROL_C011 = "C011"  # Se valida cumplimiento normativo

# Mensajes de error (en español)
ERROR_SALDO_INSUFICIENTE = "El ítem presupuestario no tiene saldo suficiente para esta transacción."
ERROR_DUPLICADO = "Ya existe una transacción con el mismo proveedor y número de documento."
ERROR_CATEGORIA_NO_COINCIDE = "La categoría del gasto no coincide con la categoría del ítem presupuestario."
ERROR_SIN_EVIDENCIA = "La transacción debe tener al menos una evidencia vinculada."
ERROR_PROYECTO_BLOQUEADO = "El proyecto está bloqueado para edición (en rendición o cerrado)."
ERROR_TRANSACCION_APROBADA = "No se puede modificar una transacción que ya ha sido aprobada o rechazada."
ERROR_SEGREGACION_FUNCIONES = "No se puede aprobar una transacción creada por el mismo usuario."
ERROR_SIN_APROBACION = "Todas las transacciones deben estar aprobadas antes de cerrar la rendición."
ERROR_FALTA_EVIDENCIA = "Todas las transacciones deben tener evidencia vinculada antes de cerrar la rendición."

# Configuración de subida de archivos
ALLOWED_EVIDENCE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # Se permite .xlsx
    'application/vnd.ms-excel',  # Se permite .xls
    'application/msword',  # Se permite .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # Se permite .docx
]

MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024  # Se define un máximo de 10 MB

# Estados de transacción
ESTADO_PENDIENTE = 'pendiente'
ESTADO_APROBADO = 'aprobado'
ESTADO_RECHAZADO = 'rechazado'

# Tipos de transacción
TIPO_INGRESO = 'ingreso'
TIPO_EGRESO = 'egreso'

# Estados del proyecto que bloquean la edición
ESTADOS_PROYECTO_BLOQUEADOS = ['en_rendicion', 'cerrado', 'completado']

