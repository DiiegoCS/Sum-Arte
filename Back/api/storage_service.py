"""
Servicio de almacenamiento para Supabase Storage.

Este módulo proporciona funciones para subir, descargar y eliminar archivos
en Supabase Storage, específicamente para evidencias de transacciones.
"""

import os
from django.conf import settings
from supabase import create_client, Client
from typing import Optional, BinaryIO
import uuid
from pathlib import Path


class SupabaseStorageService:
    """
    Servicio para gestionar archivos en Supabase Storage.
    
    Proporciona métodos para subir, obtener URLs y eliminar archivos
    de evidencias en el bucket de Supabase.
    """
    
    def __init__(self):
        """Inicializa el cliente de Supabase."""
        # Leer variables de entorno usando django-environ si está disponible
        try:
            from django.conf import settings
            from django.core.exceptions import ImproperlyConfigured
            
            # Intentar leer desde os.environ primero, luego desde settings si está disponible
            self.supabase_url = os.environ.get('SUPABASE_URL') or getattr(settings, 'SUPABASE_URL', None)
            self.supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)
            self.bucket_name = os.environ.get('SUPABASE_STORAGE_BUCKET') or getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'evidencias')
        except:
            # Fallback a os.environ si Django no está disponible
            self.supabase_url = os.environ.get('SUPABASE_URL')
            self.supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
            self.bucket_name = os.environ.get('SUPABASE_STORAGE_BUCKET', 'evidencias')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados "
                "en las variables de entorno. "
                f"SUPABASE_URL={'✓' if self.supabase_url else '✗'}, "
                f"SUPABASE_SERVICE_ROLE_KEY={'✓' if self.supabase_key else '✗'}"
            )
        
        # Inicializar cliente de Supabase
        # La función create_client acepta: url (str), key (str)
        try:
            # Verificar que las URLs y keys no estén vacías
            if not self.supabase_url or not self.supabase_key:
                raise ValueError("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no pueden estar vacíos")
            
            # Limpiar espacios en blanco
            self.supabase_url = self.supabase_url.strip()
            self.supabase_key = self.supabase_key.strip()
            
            # Inicializar cliente de Supabase
            # create_client(url: str, key: str, options: dict = None)
            # No pasar ningún argumento adicional que pueda causar conflictos
            self.client: Client = create_client(
                supabase_url=self.supabase_url,
                supabase_key=self.supabase_key
            )
        except Exception as e:
            raise ValueError(
                f"Error al inicializar cliente de Supabase: {str(e)}. "
                f"URL: {self.supabase_url[:50] if self.supabase_url else 'None'}..., "
                f"Key presente: {'Sí' if self.supabase_key else 'No'}. "
                "Verifica que las credenciales sean correctas."
            )
    
    def upload_file(
        self,
        file: BinaryIO,
        file_name: str,
        folder: str = 'evidencias',
        content_type: Optional[str] = None
    ) -> dict:
        """
        Sube un archivo a Supabase Storage.
        
        Args:
            file: Archivo a subir (objeto file-like)
            file_name: Nombre del archivo
            folder: Carpeta dentro del bucket (default: 'evidencias')
            content_type: Tipo MIME del archivo (opcional)
            
        Returns:
            dict: Diccionario con 'path' (ruta en Supabase) y 'url' (URL pública)
            
        Raises:
            Exception: Si la subida falla
        """
        # Generar un nombre único para evitar conflictos
        file_extension = Path(file_name).suffix
        unique_name = f"{uuid.uuid4()}{file_extension}"
        storage_path = f"{folder}/{unique_name}"
        
        # Leer el contenido del archivo
        file.seek(0)  # Asegurar que estamos al inicio
        file_content = file.read()
        
        # Subir el archivo
        try:
            # Usar el método correcto de la API de Supabase Storage
            storage = self.client.storage.from_(self.bucket_name)
            
            # El método upload de Supabase Storage
            # Sintaxis correcta según la documentación de supabase-py
            # upload(path: str, file: bytes, file_options: dict = None)
            file_options = {
                "content-type": content_type or "application/octet-stream",
                "upsert": "false"  # String según la API de Supabase
            }
            
            # Subir el archivo
            response = storage.upload(
                path=storage_path,
                file=file_content,
                file_options=file_options
            )
            
            # Verificar que la subida fue exitosa
            # La respuesta puede ser None si fue exitosa, o un dict con errores
            if response is not None:
                if isinstance(response, dict):
                    if 'error' in response or 'message' in response:
                        error_msg = response.get('error') or response.get('message', 'Error desconocido')
                        raise Exception(f"Error de Supabase: {error_msg}")
                elif isinstance(response, str) and 'error' in response.lower():
                    raise Exception(f"Error de Supabase: {response}")
            
            # Obtener la URL pública del archivo
            public_url = self.get_public_url(storage_path)
            
            return {
                'path': storage_path,
                'url': public_url,
                'name': unique_name,
                'original_name': file_name
            }
        except Exception as e:
            # Log del error para debugging
            import traceback
            error_trace = traceback.format_exc()
            raise Exception(f"Error al subir archivo a Supabase: {str(e)}\nTraceback: {error_trace}")
    
    def get_public_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """
        Obtiene la URL pública de un archivo en Supabase Storage.
        
        Args:
            storage_path: Ruta del archivo en Supabase
            expires_in: Tiempo de expiración en segundos (default: 1 hora)
            
        Returns:
            str: URL pública del archivo
        """
        try:
            # Obtener URL firmada (temporal) - método correcto de la API
            storage = self.client.storage.from_(self.bucket_name)
            response = storage.create_signed_url(
                path=storage_path,
                expires_in=expires_in
            )
            # La respuesta puede ser un string directamente o un dict
            if isinstance(response, str):
                return response
            elif isinstance(response, dict):
                return response.get('signedURL', response.get('url', ''))
            return ''
        except Exception as e:
            # Si falla la URL firmada, intentar URL pública directa
            # (requiere que el bucket sea público)
            # Formato correcto de URL pública de Supabase
            return f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{storage_path}"
    
    def delete_file(self, storage_path: str) -> bool:
        """
        Elimina un archivo de Supabase Storage.
        
        Args:
            storage_path: Ruta del archivo en Supabase
            
        Returns:
            bool: True si se eliminó correctamente, False en caso contrario
        """
        try:
            self.client.storage.from_(self.bucket_name).remove([storage_path])
            return True
        except Exception:
            return False
    
    def file_exists(self, storage_path: str) -> bool:
        """
        Verifica si un archivo existe en Supabase Storage.
        
        Args:
            storage_path: Ruta del archivo en Supabase
            
        Returns:
            bool: True si el archivo existe, False en caso contrario
        """
        try:
            files = self.client.storage.from_(self.bucket_name).list(
                path=Path(storage_path).parent.as_posix()
            )
            file_name = Path(storage_path).name
            return any(f.get('name') == file_name for f in files)
        except Exception:
            return False


# Instancia global del servicio
_storage_service: Optional[SupabaseStorageService] = None


def get_storage_service() -> SupabaseStorageService:
    """
    Obtiene la instancia global del servicio de almacenamiento.
    
    Returns:
        SupabaseStorageService: Instancia del servicio
    """
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService()
    return _storage_service

