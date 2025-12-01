"""
Servicio de OCR usando Google Gemini Pro Vision API.

Este servicio permite extraer información estructurada de documentos
(facturas, boletas, etc.) usando reconocimiento óptico de caracteres (OCR)
potenciado por Large Language Models.
"""

import base64
import json
import os
import logging
from typing import Dict, Optional, Any
from django.conf import settings
import google.generativeai as genai

logger = logging.getLogger(__name__)


class OCRService:
    """
    Servicio para procesar documentos y extraer información usando Gemini Vision API.
    """
    
    def __init__(self):
        """
        Inicializa el servicio de OCR con la API key de Google Gemini.
        """
        api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
        if not api_key:
            raise ValueError(
                "GOOGLE_GEMINI_API_KEY no está configurada. "
                "Por favor, configura esta variable de entorno."
            )
        genai.configure(api_key=api_key)
        self.api_key = api_key
        # Lista de modelos a intentar en orden de preferencia
        # Priorizar modelos no experimentales que tienen mejor cuota gratuita
        # El modelo se seleccionará dinámicamente cuando se use
        self.model_names = [
            'gemini-2.0-flash',        # Modelo estable (mejor cuota que experimental)
            'gemini-2.5-flash',        # Modelo más reciente y estable
            'gemini-pro-vision',       # Modelo clásico para visión (más compatible)
            'gemini-flash-latest',     # Última versión flash (puede tener mejor cuota)
            'gemini-2.0-flash-001',    # Versión específica estable
            'gemini-pro-latest',       # Última versión pro
            'gemini-2.0-flash-exp',    # Experimental (última opción, puede tener cuota limitada)
        ]
        self.model = None  # Se inicializará cuando se use
        self._available_models = None  # Cache de modelos disponibles
    
    def _get_available_models(self):
        """
        Obtiene la lista de modelos disponibles en la API.
        
        Returns:
            Lista de nombres de modelos disponibles
        """
        if self._available_models is not None:
            return self._available_models
        
        try:
            # Listar modelos disponibles
            models = genai.list_models()
            available = [model.name.split('/')[-1] for model in models 
                        if 'generateContent' in model.supported_generation_methods]
            self._available_models = available
            return available
        except Exception as e:
            # Si falla, usar la lista por defecto
            logger.warning(f"No se pudieron listar modelos disponibles: {e}")
            self._available_models = self.model_names
            return self.model_names
    
    def _generate_content_with_fallback(self, prompt, image):
        """
        Genera contenido usando Gemini API, intentando diferentes modelos hasta que uno funcione.
        
        Args:
            prompt: El prompt de texto
            image: La imagen PIL a procesar
            
        Returns:
            La respuesta del modelo
            
        Raises:
            Exception: Si todos los modelos fallan
        """
        # Obtener modelos disponibles
        available_models = self._get_available_models()
        
        # Filtrar modelos a intentar: solo los que están en nuestra lista Y disponibles
        models_to_try = [m for m in self.model_names if m in available_models]
        
        # Si no hay modelos disponibles, intentar todos de todas formas
        if not models_to_try:
            logger.warning("No se encontraron modelos disponibles en la lista. Intentando todos...")
            models_to_try = self.model_names
        
        last_error = None
        
        for model_name in models_to_try:
            try:
                logger.info(f"Intentando usar modelo: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([prompt, image])
                # Si llegamos aquí, el modelo funcionó
                logger.info(f"Modelo {model_name} funcionó correctamente")
                self.model = model  # Guardar el modelo que funcionó para futuros usos
                return response
            except Exception as e:
                error_str = str(e)
                # Si es error de cuota (429), continuar con el siguiente modelo
                if '429' in error_str or 'quota' in error_str.lower() or 'Quota exceeded' in error_str:
                    logger.warning(f"Cuota excedida para modelo {model_name}. Intentando siguiente modelo...")
                    last_error = e
                    continue
                # Si es error 404 (modelo no encontrado), continuar
                elif '404' in error_str or 'not found' in error_str.lower():
                    logger.warning(f"Modelo {model_name} no encontrado. Intentando siguiente modelo...")
                    last_error = e
                    continue
                else:
                    logger.warning(f"Error al usar modelo {model_name}: {str(e)}")
                    last_error = e
                    # Continuar con el siguiente modelo
                    continue
        
        # Si llegamos aquí, todos los modelos fallaron
        raise Exception(
            f"No se pudo usar ningún modelo de Gemini. Último error: {str(last_error)}. "
            f"Modelos intentados: {', '.join(models_to_try)}. "
            f"Modelos disponibles en API: {', '.join(available_models) if available_models else 'No se pudieron listar'}"
        )
    
    def process_document(
        self, 
        image_data: bytes, 
        mime_type: str = 'image/jpeg'
    ) -> Dict[str, Any]:
        """
        Procesa un documento/imagen y extrae información estructurada.
        
        Args:
            image_data: Bytes de la imagen/documento
            mime_type: Tipo MIME del archivo (image/jpeg, image/png, application/pdf, etc.)
            
        Returns:
            Dict con la información extraída del documento
        """
        try:
            # Crear el prompt para extraer información estructurada
            prompt = """
Analiza este documento (factura, boleta, recibo, etc.) y extrae la siguiente información en formato JSON:

{
  "proveedor": {
    "nombre": "nombre del proveedor o emisor",
    "rut": "RUT del proveedor si está visible (formato: 12345678-9)",
    "email": "email del proveedor si está visible"
  },
  "documento": {
    "numero": "número de documento (factura, boleta, etc.)",
    "tipo": "tipo de documento (factura electrónica, boleta, recibo, etc.)",
    "fecha": "fecha del documento en formato YYYY-MM-DD"
  },
  "monto": {
    "total": número_total_sin_iva_o_con_iva,
    "neto": monto_neto_si_está_disponible,
    "iva": monto_iva_si_está_disponible
  },
  "banco": {
    "cuenta": "número de cuenta bancaria si está visible",
    "operacion": "número de operación bancaria si está visible"
  },
  "confianza": nivel_de_confianza_de_0_a_1
}

IMPORTANTE:
- Si algún campo no está visible o no se puede determinar, usa null
- Las fechas deben estar en formato YYYY-MM-DD
- Los montos deben ser números (no strings)
- El RUT debe estar en formato chileno (12345678-9)
- Responde SOLO con el JSON, sin texto adicional
"""
            
            # Manejar PDFs e imágenes de manera diferente
            import io
            
            # Detectar PDFs de manera más robusta (puede venir con charset u otros parámetros)
            is_pdf = mime_type == 'application/pdf' or mime_type.startswith('application/pdf')
            
            if is_pdf:
                # Para PDFs, necesitamos convertirlos a imagen primero
                # ya que PIL no puede abrir PDFs directamente
                # Usaremos PyMuPDF (fitz) para convertir el PDF a imagen
                try:
                    import fitz  # PyMuPDF
                    # Abrir el PDF
                    pdf_document = fitz.open(stream=image_data, filetype="pdf")
                    
                    # Verificar que el PDF tenga al menos una página
                    if len(pdf_document) == 0:
                        raise Exception("El PDF no tiene páginas")
                    
                    # Obtener la primera página
                    page = pdf_document[0]
                    
                    # Convertir la página a imagen (PNG)
                    mat = fitz.Matrix(2.0, 2.0)  # Escala 2x para mejor calidad
                    pix = page.get_pixmap(matrix=mat)
                    
                    # Convertir a PIL Image
                    import PIL.Image
                    img_data = pix.tobytes("png")
                    image = PIL.Image.open(io.BytesIO(img_data))
                    
                    pdf_document.close()
                    
                    # Generar respuesta usando Gemini Vision con imagen
                    response = self._generate_content_with_fallback(prompt, image)
                    
                except ImportError:
                    raise Exception(
                        "PyMuPDF no está instalado. "
                        "Por favor, ejecuta: pip install PyMuPDF"
                    )
                except Exception as e:
                    raise Exception(
                        f"Error al procesar PDF con PyMuPDF: {str(e)}"
                    )
            else:
                # Para imágenes, usar PIL para convertir a formato compatible
                import PIL.Image
                
                # Convertir bytes a imagen PIL
                image = PIL.Image.open(io.BytesIO(image_data))
                
                # Generar respuesta usando Gemini Vision con imagen
                response = self._generate_content_with_fallback(prompt, image)
            
            # Extraer el texto de la respuesta
            response_text = response.text.strip()
            
            # Limpiar el texto para extraer solo el JSON
            # Remover markdown code blocks si existen
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parsear el JSON
            try:
                extracted_data = json.loads(response_text)
            except json.JSONDecodeError as e:
                # Si falla el parsing, intentar extraer JSON del texto
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    extracted_data = json.loads(json_match.group())
                else:
                    raise ValueError(f"No se pudo extraer JSON válido de la respuesta: {response_text}")
            
            # Validar y normalizar los datos
            normalized_data = self._normalize_data(extracted_data)
            
            return normalized_data
            
        except Exception as e:
            raise Exception(f"Error al procesar documento con OCR: {str(e)}")
    
    def _normalize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normaliza y valida los datos extraídos.
        
        Args:
            data: Datos extraídos del documento
            
        Returns:
            Datos normalizados
        """
        normalized = {
            "proveedor": {
                "nombre": data.get("proveedor", {}).get("nombre") or None,
                "rut": self._normalize_rut(data.get("proveedor", {}).get("rut")) if data.get("proveedor", {}).get("rut") else None,
                "email": data.get("proveedor", {}).get("email") or None
            },
            "documento": {
                "numero": data.get("documento", {}).get("numero") or None,
                "tipo": self._normalize_tipo_documento(data.get("documento", {}).get("tipo")) if data.get("documento", {}).get("tipo") else None,
                "fecha": self._normalize_fecha(data.get("documento", {}).get("fecha")) if data.get("documento", {}).get("fecha") else None
            },
            "monto": {
                "total": self._normalize_monto(data.get("monto", {}).get("total")) if data.get("monto", {}).get("total") else None,
                "neto": self._normalize_monto(data.get("monto", {}).get("neto")) if data.get("monto", {}).get("neto") else None,
                "iva": self._normalize_monto(data.get("monto", {}).get("iva")) if data.get("monto", {}).get("iva") else None
            },
            "banco": {
                "cuenta": data.get("banco", {}).get("cuenta") or None,
                "operacion": data.get("banco", {}).get("operacion") or None
            },
            "confianza": data.get("confianza", 0.5)
        }
        
        return normalized
    
    def _normalize_rut(self, rut: str) -> Optional[str]:
        """
        Normaliza el formato del RUT chileno.
        
        Args:
            rut: RUT en cualquier formato
            
        Returns:
            RUT normalizado (12345678-9) o None si no es válido
        """
        if not rut:
            return None
        
        # Remover espacios y puntos, mantener guión
        rut_clean = rut.replace('.', '').replace(' ', '').upper()
        
        # Validar formato básico
        if '-' in rut_clean:
            parts = rut_clean.split('-')
            if len(parts) == 2 and parts[0].isdigit() and (parts[1].isdigit() or parts[1] == 'K'):
                return rut_clean
        
        return rut_clean if len(rut_clean) > 0 else None
    
    def _normalize_tipo_documento(self, tipo: str) -> Optional[str]:
        """
        Normaliza el tipo de documento a los valores aceptados por el sistema.
        
        Args:
            tipo: Tipo de documento extraído
            
        Returns:
            Tipo normalizado o None
        """
        if not tipo:
            return None
        
        tipo_lower = tipo.lower()
        
        # Mapeo de tipos comunes
        tipo_map = {
            'factura': 'factura electrónica',
            'factura electrónica': 'factura electrónica',
            'factura electronica': 'factura electrónica',
            'boleta': 'boleta',
            'boleta electrónica': 'boleta',
            'boleta electronica': 'boleta',
            'recibo': 'recibo',
            'nota de crédito': 'nota de crédito',
            'nota de debito': 'nota de débito',
            'nota de débito': 'nota de débito',
        }
        
        # Buscar coincidencia parcial
        for key, value in tipo_map.items():
            if key in tipo_lower:
                return value
        
        # Si no hay coincidencia, retornar el original
        return tipo
    
    def _normalize_fecha(self, fecha: str) -> Optional[str]:
        """
        Normaliza la fecha al formato YYYY-MM-DD.
        
        Args:
            fecha: Fecha en cualquier formato
            
        Returns:
            Fecha en formato YYYY-MM-DD o None
        """
        if not fecha:
            return None
        
        from datetime import datetime
        
        # Intentar diferentes formatos de fecha
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%d-%m-%Y',
            '%Y/%m/%d',
            '%d.%m.%Y',
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(fecha.strip(), fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        return None
    
    def _normalize_monto(self, monto: Any) -> Optional[float]:
        """
        Normaliza el monto a un número float.
        
        Args:
            monto: Monto en cualquier formato
            
        Returns:
            Monto como float o None
        """
        if monto is None:
            return None
        
        # Si ya es un número
        if isinstance(monto, (int, float)):
            return float(monto)
        
        # Si es string, limpiar y convertir
        if isinstance(monto, str):
            # Remover símbolos de moneda, puntos (separadores de miles) y espacios
            monto_clean = monto.replace('$', '').replace('.', '').replace(' ', '').replace(',', '.')
            try:
                return float(monto_clean)
            except ValueError:
                return None
        
        return None

