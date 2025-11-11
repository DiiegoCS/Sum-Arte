from rest_framework import serializers
from .models import (Proyecto, Organizacion, Usuario, Rol, Usuario_Rol_Proyecto, Proveedor, Transaccion,
                     Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Log_transaccion)

class OrganizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizacion
        fields = '__all__'

class ProyectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proyecto
        fields = '__all__'

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'

class TransaccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaccion
        fields = '__all__'

class EvidenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidencia
        fields = '__all__'

class TransaccionEvidenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaccion_Evidencia
        fields = '__all__'

class LogTransaccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Log_transaccion
        fields = '__all__'

class ItemPresupuestarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item_Presupuestario
        fields = '__all__'

class SubitemPresupuestarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subitem_Presupuestario
        fields = '__all__'

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'

class UsuarioRolProyectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario_Rol_Proyecto
        fields = '__all__'

# --- Serializer de Usuario ---
class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'id_organizacion']
        
        read_only_fields = ['id']

        extra_kwargs = {
            'password': {'write_only': True}
        }

    # La contraseña se guarda hasheada y no como texto plano.
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password is not None:
            instance.set_password(password) # set_password encripta la contraseña
        instance.save()
        return instance