"""
Script de prueba para verificar la conexión con Supabase Storage.

Ejecutar desde la raíz del proyecto Back:
python test_supabase_connection.py
"""

import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_supabase_connection():
    """Prueba la conexión con Supabase Storage."""
    print("=" * 60)
    print("Prueba de Conexión con Supabase Storage")
    print("=" * 60)
    
    # Verificar variables de entorno
    print("\n1. Verificando variables de entorno...")
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    bucket_name = os.environ.get('SUPABASE_STORAGE_BUCKET', 'evidencias')
    
    if not supabase_url:
        print("✗ SUPABASE_URL no está configurado")
        return False
    else:
        print(f"✓ SUPABASE_URL: {supabase_url[:50]}...")
    
    if not supabase_key:
        print("✗ SUPABASE_SERVICE_ROLE_KEY no está configurado")
        return False
    else:
        print(f"✓ SUPABASE_SERVICE_ROLE_KEY: {'*' * 20}...{supabase_key[-10:]}")
    
    print(f"✓ Bucket: {bucket_name}")
    
    # Probar inicialización del cliente
    print("\n2. Inicializando cliente de Supabase...")
    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        print("✓ Cliente inicializado correctamente")
    except Exception as e:
        print(f"✗ Error al inicializar cliente: {e}")
        return False
    
    # Probar acceso al storage
    print("\n3. Probando acceso a Storage...")
    try:
        storage = client.storage.from_(bucket_name)
        print("✓ Acceso a Storage obtenido")
    except Exception as e:
        print(f"✗ Error al acceder a Storage: {e}")
        return False
    
    # Probar listar archivos
    print("\n4. Listando archivos en el bucket...")
    try:
        files = storage.list()
        print(f"✓ Archivos encontrados: {len(files) if files else 0}")
        if files:
            for f in files[:5]:  # Mostrar primeros 5
                print(f"  - {f.get('name', 'N/A')}")
    except Exception as e:
        print(f"✗ Error al listar archivos: {e}")
        return False
    
    # Probar subida de un archivo de prueba
    print("\n5. Probando subida de archivo de prueba...")
    try:
        test_content = b"Este es un archivo de prueba"
        test_path = "test/test_file.txt"
        
        response = storage.upload(
            path=test_path,
            file=test_content,
            file_options={"content-type": "text/plain", "upsert": "true"}
        )
        print("✓ Archivo de prueba subido correctamente")
        
        # Limpiar: eliminar el archivo de prueba
        try:
            storage.remove([test_path])
            print("✓ Archivo de prueba eliminado")
        except:
            pass
        
    except Exception as e:
        print(f"✗ Error al subir archivo de prueba: {e}")
        import traceback
        print(traceback.format_exc())
        return False
    
    print("\n" + "=" * 60)
    print("✓ Todas las pruebas pasaron correctamente")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_supabase_connection()
    sys.exit(0 if success else 1)

