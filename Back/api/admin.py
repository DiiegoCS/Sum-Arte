from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (Proyecto, Organizacion, Usuario, Rol, Usuario_Rol_Proyecto, Proveedor, Transaccion,
                     Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Log_transaccion,
                     InvitacionUsuario)


# -- Formulario pesonalizado para modelo Usuario
class UsuarioAdmin(UserAdmin):
    # Campos que se muestran al CREAR un usuario
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'id_organizacion',)}),
    )
    
    # Campos que se muestran al EDITAR un usuario
    fieldsets = UserAdmin.fieldsets + (
        ('Info de Organización', {'fields': ('id_organizacion',)}),
    )

admin.site.register(Proyecto)
admin.site.register(Organizacion)
admin.site.register(Usuario, UsuarioAdmin)  # Registro del modelo Usuario en el admin
admin.site.register(Rol)
admin.site.register(Usuario_Rol_Proyecto)
admin.site.register(Proveedor)
admin.site.register(Transaccion)
admin.site.register(Item_Presupuestario)
admin.site.register(Subitem_Presupuestario)
admin.site.register(Evidencia)
admin.site.register(Transaccion_Evidencia)
admin.site.register(Log_transaccion)
admin.site.register(InvitacionUsuario)
