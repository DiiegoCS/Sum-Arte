"""
Utilidades para la API de Sum-Arte.

Este módulo contiene funciones auxiliares reutilizables para validaciones,
formateo y otras operaciones comunes.
"""

import re


def validar_rut_chileno(rut):
    """
    Valida el formato y dígito verificador de un RUT chileno.
    
    El RUT debe tener el formato: 12345678-9 o 12345678-K
    donde el dígito verificador puede ser un número del 0-9 o la letra K.
    
    Args:
        rut (str): RUT a validar (puede incluir puntos y guion)
        
    Returns:
        tuple: (es_valido: bool, rut_limpio: str, mensaje_error: str)
        
    Examples:
        >>> validar_rut_chileno("12345678-9")
        (True, "12345678-9", None)
        
        >>> validar_rut_chileno("12.345.678-9")
        (True, "12345678-9", None)
        
        >>> validar_rut_chileno("12345678-0")
        (False, None, "El dígito verificador del RUT es inválido.")
    """
    if not rut:
        return False, None, "El RUT es requerido."
    
    # Limpiar el RUT: eliminar puntos y espacios, convertir a mayúsculas
    rut_limpio = re.sub(r'[.\s]', '', rut.strip().upper())
    
    # Validar formato básico: debe tener al menos 8 dígitos seguidos de un guion y un dígito verificador
    if not re.match(r'^\d{7,8}-[\dkK]$', rut_limpio):
        return False, None, "El formato del RUT es inválido. Debe ser: 12345678-9"
    
    # Separar número y dígito verificador
    partes = rut_limpio.split('-')
    if len(partes) != 2:
        return False, None, "El formato del RUT es inválido. Debe incluir un guion."
    
    numero_str = partes[0]
    digito_verificador = partes[1]
    
    # Validar que el número tenga entre 7 y 8 dígitos
    if len(numero_str) < 7 or len(numero_str) > 8:
        return False, None, "El RUT debe tener entre 7 y 8 dígitos antes del guion."
    
    # Calcular dígito verificador
    numero = int(numero_str)
    multiplicadores = [2, 3, 4, 5, 6, 7, 2, 3]
    suma = 0
    
    # Multiplicar dígitos de derecha a izquierda
    for i, digito in enumerate(reversed(numero_str)):
        if i < len(multiplicadores):
            suma += int(digito) * multiplicadores[i]
    
    # Calcular resto y dígito verificador esperado
    resto = suma % 11
    digito_esperado = 11 - resto
    
    # Ajustar casos especiales
    if digito_esperado == 11:
        digito_esperado = '0'
    elif digito_esperado == 10:
        digito_esperado = 'K'
    else:
        digito_esperado = str(digito_esperado)
    
    # Validar dígito verificador
    if digito_verificador != digito_esperado:
        return False, None, f"El dígito verificador del RUT es inválido. Debería ser: {digito_esperado}"
    
    # Retornar RUT en formato estándar (sin puntos, con guion)
    return True, rut_limpio, None


def formatear_rut(rut):
    """
    Formatea un RUT chileno agregando puntos como separadores de miles.
    
    Args:
        rut (str): RUT en formato 12345678-9
        
    Returns:
        str: RUT formateado como 12.345.678-9
        
    Examples:
        >>> formatear_rut("12345678-9")
        "12.345.678-9"
    """
    if not rut:
        return rut
    
    # Limpiar y normalizar
    rut_limpio = re.sub(r'[.\s]', '', rut.strip().upper())
    
    # Separar número y dígito verificador
    if '-' in rut_limpio:
        partes = rut_limpio.split('-')
        numero = partes[0]
        digito = partes[1]
        
        # Agregar puntos cada 3 dígitos desde la derecha
        numero_formateado = ''
        numero_reverso = numero[::-1]
        for i in range(0, len(numero_reverso), 3):
            numero_formateado = numero_reverso[i:i+3] + '.' + numero_formateado
        
        # Eliminar punto inicial si existe
        numero_formateado = numero_formateado.rstrip('.')
        numero_formateado = numero_formateado[::-1]
        
        return f"{numero_formateado}-{digito}"
    
    return rut_limpio

