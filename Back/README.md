Sum-Arte
=========

Notas rápidas
------------

- CKEditor: la instalación actual incluye `django-ckeditor` que empaqueta CKEditor 4.22.1. Al ejecutar `manage.py check` se muestra la advertencia W001 indicando que esa versión de CKEditor tiene problemas de seguridad conocidos y que podrías considerar:
  - Actualizar a CKEditor 4 LTS (ver CKEditor 4.24.0-LTS) — puede requerir comprar la versión LTS según licencia, o
  - Migrar a CKEditor 5 usando `django-ckeditor-5` (comprobar compatibilidad y licencias), o
  - Evaluar otro editor si prefieres evitar CKEditor.

Pasos rápidos para desarrolladores
---------------------------------

1. Activar el virtualenv:

```powershell
& .\myvenv\Scripts\Activate.ps1
```

2. Ejecutar comprobaciones Django:

```powershell
python manage.py check
```

3. Variables de entorno

- Se usa `core/.env` (ignorarlo en git). Contiene claves como `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, etc.

Si quieres que automatice la migración a CKEditor 5 o que silencie la advertencia en CI, dime y lo preparo.
