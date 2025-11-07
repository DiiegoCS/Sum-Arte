Sum-Arte
=========

Notas rápidas
------------

- CKEditor: la instalación actual incluye `django-ckeditor` que empaqueta CKEditor 4.22.1. 

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

