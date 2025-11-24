"""
Serializadores para la API de Sum-Arte.

En este módulo se definen todos los serializers de DRF con relaciones anidadas,
validación personalizada, campos calculados y mensajes de error en español.
"""

from rest_framework import serializers
from .models import (
    Proyecto, Organizacion, Usuario, Rol, Usuario_Rol_Proyecto, Proveedor, Transaccion,
    Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Log_transaccion
)
from .validators import (
    validar_duplicidad, validar_saldo_disponible, validar_categoria_gasto,
    validar_proyecto_no_bloqueado
)

class OrganizacionSerializer(serializers.ModelSerializer):
    """Serializador para organizaciones."""
    
    class Meta:
        model = Organizacion
        fields = '__all__'
    
    def validate_rut_organizacion(self, value):
        """Valida que el RUT tenga al menos 8 caracteres."""
        if not value or len(value) < 8:
            raise serializers.ValidationError("El RUT debe tener al menos 8 caracteres.")
        return value

class ProveedorSerializer(serializers.ModelSerializer):
    """Serializador para proveedores."""
    
    class Meta:
        model = Proveedor
        fields = '__all__'
    
    def validate_rut_proveedor(self, value):
        """Valida que el RUT del proveedor tenga al menos 8 caracteres."""
        if not value or len(value) < 8:
            raise serializers.ValidationError("El RUT del proveedor debe tener al menos 8 caracteres.")
        return value

class SubitemPresupuestarioSerializer(serializers.ModelSerializer):
    """Serializador para subítems presupuestarios, incluyendo campos calculados."""
    
    saldo_disponible = serializers.ReadOnlyField()
    porcentaje_ejecutado = serializers.SerializerMethodField()
    
    class Meta:
        model = Subitem_Presupuestario
        fields = '__all__'
        read_only_fields = ['monto_ejecutado_subitem']
    
    def get_porcentaje_ejecutado(self, obj):
        """Calcula el porcentaje ejecutado del subítem."""
        return obj.porcentaje_ejecutado()

class ItemPresupuestarioSerializer(serializers.ModelSerializer):
    """Serializador para ítems presupuestarios con subítems anidados."""
    
    saldo_disponible = serializers.ReadOnlyField()
    porcentaje_ejecutado = serializers.SerializerMethodField()
    subitems = SubitemPresupuestarioSerializer(many=True, read_only=True)
    
    class Meta:
        model = Item_Presupuestario
        fields = '__all__'
        read_only_fields = ['monto_ejecutado_item']
    
    def get_porcentaje_ejecutado(self, obj):
        """Calcula el porcentaje ejecutado del ítem."""
        return obj.porcentaje_ejecutado()

class ProyectoSerializer(serializers.ModelSerializer):
    """Serializador para proyectos con ítems presupuestarios anidados."""
    
    items_presupuestarios = ItemPresupuestarioSerializer(many=True, read_only=True)
    monto_disponible = serializers.SerializerMethodField()
    porcentaje_ejecutado = serializers.SerializerMethodField()
    organizacion_nombre = serializers.CharField(source='id_organizacion.nombre_organizacion', read_only=True)
    
    class Meta:
        model = Proyecto
        fields = '__all__'
        read_only_fields = ['monto_ejecutado_proyecto']
    
    def get_monto_disponible(self, obj):
        """Calcula el monto disponible del proyecto."""
        return float(obj.presupuesto_total - obj.monto_ejecutado_proyecto)
    
    def get_porcentaje_ejecutado(self, obj):
        """Calcula el porcentaje ejecutado del proyecto."""
        if obj.presupuesto_total == 0:
            return 0.0
        return float((obj.monto_ejecutado_proyecto / obj.presupuesto_total) * 100)

class EvidenciaSerializer(serializers.ModelSerializer):
    """Serializador para evidencias, mostrando información del usuario cargador."""
    
    usuario_carga_nombre = serializers.CharField(source='usuario_carga.username', read_only=True)
    archivo_url = serializers.SerializerMethodField()
    tamanio_archivo = serializers.SerializerMethodField()
    
    class Meta:
        model = Evidencia
        fields = '__all__'
        read_only_fields = ['fecha_carga', 'version', 'usuario_carga']
    
    def get_archivo_url(self, obj):
        """Obtiene la URL completa del archivo de evidencia."""
        if obj.archivo_evidencia:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo_evidencia.url)
            return obj.archivo_evidencia.url
        return None
    
    def get_tamanio_archivo(self, obj):
        """Obtiene el tamaño en bytes del archivo de evidencia."""
        if obj.archivo_evidencia:
            try:
                return obj.archivo_evidencia.size
            except:
                return None
        return None

class TransaccionEvidenciaSerializer(serializers.ModelSerializer):
    """Serializador para la relación transacción-evidencia."""
    
    evidencia = EvidenciaSerializer(read_only=True)
    evidencia_id = serializers.PrimaryKeyRelatedField(
        queryset=Evidencia.objects.filter(eliminado=False),
        source='evidencia',
        write_only=True
    )
    
    class Meta:
        model = Transaccion_Evidencia
        fields = '__all__'

class LogTransaccionSerializer(serializers.ModelSerializer):
    """Serializador para logs de transacciones."""
    
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    accion_display = serializers.CharField(source='get_accion_realizada_display', read_only=True)
    
    class Meta:
        model = Log_transaccion
        fields = '__all__'
        read_only_fields = ['fecha_hora_accion']

class TransaccionSerializer(serializers.ModelSerializer):
    """Serializador para transacciones, con relaciones anidadas y validaciones."""
    
    # Se definen los campos anidados de solo lectura
    proyecto_nombre = serializers.CharField(source='proyecto.nombre_proyecto', read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre_proveedor', read_only=True)
    item_presupuestario_nombre = serializers.CharField(
        source='item_presupuestario.nombre_item_presupuesto',
        read_only=True,
        allow_null=True
    )
    subitem_presupuestario_nombre = serializers.CharField(
        source='subitem_presupuestario.nombre_subitem_presupuesto',
        read_only=True,
        allow_null=True
    )
    usuario_aprobador_nombre = serializers.CharField(
        source='usuario_aprobador.username',
        read_only=True,
        allow_null=True
    )
    estado_display = serializers.CharField(source='get_estado_transaccion_display', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_transaccion_display', read_only=True)
    tipo_doc_display = serializers.CharField(source='get_tipo_doc_transaccion_display', read_only=True)
    
    # Se muestran las evidencias vinculadas a la transacción
    evidencias = serializers.SerializerMethodField()
    
    # Se muestran los logs relacionados a la transacción
    logs = LogTransaccionSerializer(many=True, read_only=True)
    
    # Campos calculados
    puede_editar = serializers.SerializerMethodField()
    puede_aprobar = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaccion
        fields = '__all__'
        read_only_fields = [
            'fecha_creacion', 'fecha_actualizacion', 'fecha_aprobacion',
            'usuario_aprobador', 'estado_transaccion'
        ]
    
    def get_evidencias(self, obj):
        """Obtiene la lista de evidencias asociadas a la transacción."""
        evidencias = Transaccion_Evidencia.objects.filter(
            transaccion=obj,
            evidencia__eliminado=False
        ).select_related('evidencia')
        return EvidenciaSerializer(
            [te.evidencia for te in evidencias],
            many=True,
            context=self.context
        ).data
    
    def get_puede_editar(self, obj):
        """Indica si la transacción puede ser editada actualmente."""
        return obj.puede_editar()
    
    def get_puede_aprobar(self, obj):
        """Indica si el usuario actual puede aprobar la transacción."""
        request = self.context.get('request')
        if request and request.user:
            return obj.puede_aprobar(request.user)
        return False
    
    def validate(self, data):
        """Ejecuta la validación personalizada de la transacción."""
        # Se valida la duplicidad de la transacción (C003)
        proveedor = data.get('proveedor') or (self.instance.proveedor if self.instance else None)
        nro_documento = data.get('nro_documento') or (self.instance.nro_documento if self.instance else None)
        
        if proveedor and nro_documento:
            transaccion_id = self.instance.id if self.instance else None
            try:
                validar_duplicidad(proveedor, nro_documento, transaccion_id)
            except Exception as e:
                raise serializers.ValidationError(str(e))
        
        # Se impide la modificación si la transacción ya fue aprobada o rechazada
        if self.instance and self.instance.estado_transaccion != 'pendiente':
            raise serializers.ValidationError(
                "No se puede modificar una transacción que ya ha sido aprobada o rechazada."
            )
        
        # Se valida que el proyecto asociado no esté bloqueado
        proyecto = data.get('proyecto') or (self.instance.proyecto if self.instance else None)
        if proyecto:
            try:
                validar_proyecto_no_bloqueado(proyecto)
            except Exception as e:
                raise serializers.ValidationError(str(e))
        
        # Si la transacción es de tipo egreso, se valida el saldo disponible y la categoría
        if data.get('tipo_transaccion') == 'egreso' or (self.instance and self.instance.tipo_transaccion == 'egreso'):
            item = data.get('item_presupuestario') or (self.instance.item_presupuestario if self.instance else None)
            subitem = data.get('subitem_presupuestario') or (self.instance.subitem_presupuestario if self.instance else None)
            monto = data.get('monto_transaccion') or (self.instance.monto_transaccion if self.instance else None)
            
            if monto and (item or subitem):
                # Se crea una instancia temporal de Transaccion para realizar la validación de saldo
                transaccion_temp = Transaccion(
                    monto_transaccion=monto,
                    item_presupuestario=item,
                    subitem_presupuestario=subitem,
                    tipo_transaccion='egreso'
                )
                try:
                    if subitem:
                        validar_saldo_disponible(transaccion_temp, subitem_presupuestario=subitem)
                    elif item:
                        validar_saldo_disponible(transaccion_temp, item_presupuestario=item)
                except Exception as e:
                    raise serializers.ValidationError(str(e))
            
            # Se valida que la categoría de gasto corresponda (C006)
            if item and data.get('categoria_gasto'):
                transaccion_temp = Transaccion(
                    categoria_gasto=data.get('categoria_gasto'),
                    item_presupuestario=item
                )
                try:
                    validar_categoria_gasto(transaccion_temp, item)
                except Exception as e:
                    raise serializers.ValidationError(str(e))
        
        return data

class RolSerializer(serializers.ModelSerializer):
    """Serializador para roles."""
    
    class Meta:
        model = Rol
        fields = '__all__'

class UsuarioRolProyectoSerializer(serializers.ModelSerializer):
    """Serializador para las asignaciones de usuario-rol-proyecto."""
    
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    rol_nombre = serializers.CharField(source='rol.nombre_rol', read_only=True)
    proyecto_nombre = serializers.CharField(source='proyecto.nombre_proyecto', read_only=True)
    
    class Meta:
        model = Usuario_Rol_Proyecto
        fields = '__all__'

class UsuarioSerializer(serializers.ModelSerializer):
    """Serializador para usuarios."""
    
    organizacion_nombre = serializers.CharField(
        source='id_organizacion.nombre_organizacion',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'id_organizacion', 'organizacion_nombre', 'is_superuser', 'is_active']
        read_only_fields = ['id']
        
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
    
    def create(self, validated_data):
        """Crea un usuario nuevo, guardando la contraseña de manera segura."""
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance
    
    def update(self, instance, validated_data):
        """Actualiza los datos del usuario, hasheando la contraseña si se incluye."""
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance
