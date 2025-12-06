"""
Serializadores para la API de Sum-Arte.

En este módulo se definen todos los serializers de DRF con relaciones anidadas,
validación personalizada, campos calculados y mensajes de error en español.
"""

from rest_framework import serializers
from .models import (
    Proyecto, Organizacion, Usuario, Rol, Usuario_Rol_Proyecto, Proveedor, Transaccion,
    Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Log_transaccion,
    InvitacionUsuario, InformeGenerado
)
from .validators import (
    validar_duplicidad, validar_saldo_disponible, validar_categoria_gasto,
    validar_proyecto_no_bloqueado
)
from .utils import validar_rut_chileno

class OrganizacionSerializer(serializers.ModelSerializer):
    """
    Serializador para organizaciones.
    
    Incluye validación completa de RUT chileno con dígito verificador.
    """
    
    class Meta:
        model = Organizacion
        fields = '__all__'
        read_only_fields = ['estado_suscripcion']  # El estado se establece automáticamente
    
    def validate_rut_organizacion(self, value):
        """
        Valida el formato y dígito verificador de un RUT chileno.
        
        Args:
            value: RUT a validar
            
        Returns:
            str: RUT validado y normalizado
            
        Raises:
            ValidationError: Si el RUT es inválido
        """
        if not value:
            raise serializers.ValidationError("El RUT es requerido.")
        
        # Validar RUT chileno
        es_valido, rut_limpio, mensaje_error = validar_rut_chileno(value)
        
        if not es_valido:
            raise serializers.ValidationError(mensaje_error)
        
        # Verificar que el RUT no esté en uso
        from .models import Organizacion
        queryset = Organizacion.objects.filter(rut_organizacion=rut_limpio)
        
        # Si estamos actualizando, excluir la instancia actual
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError("Este RUT ya está registrado.")
        
        return rut_limpio
    
    def validate_nombre_organizacion(self, value):
        """Valida que el nombre de la organización no esté vacío."""
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("El nombre de la organización debe tener al menos 3 caracteres.")
        return value.strip()

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
    estado_display = serializers.CharField(source='get_estado_proyecto_display', read_only=True)
    
    class Meta:
        model = Proyecto
        fields = '__all__'
        read_only_fields = ['monto_ejecutado_proyecto']
        extra_kwargs = {
            'id_organizacion': {'required': False}
        }
    
    def validate_nombre_proyecto(self, value):
        """Valida que el nombre del proyecto no esté vacío."""
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("El nombre del proyecto debe tener al menos 3 caracteres.")
        return value.strip()
    
    def validate_presupuesto_total(self, value):
        """Valida que el presupuesto sea positivo."""
        if value <= 0:
            raise serializers.ValidationError("El presupuesto total debe ser mayor a cero.")
        return value
    
    def validate(self, data):
        """Valida las fechas del proyecto."""
        fecha_inicio = data.get('fecha_inicio_proyecto')
        fecha_fin = data.get('fecha_fin_proyecto')
        
        # Si estamos actualizando, usar las fechas existentes si no se proporcionan
        if self.instance:
            fecha_inicio = fecha_inicio or self.instance.fecha_inicio_proyecto
            fecha_fin = fecha_fin or self.instance.fecha_fin_proyecto
        
        if fecha_inicio and fecha_fin:
            if fecha_fin < fecha_inicio:
                raise serializers.ValidationError({
                    'fecha_fin_proyecto': 'La fecha de fin debe ser posterior a la fecha de inicio.'
                })
        
        return data
    
    def get_monto_disponible(self, obj):
        """Calcula el monto disponible del proyecto."""
        presupuesto = float(obj.presupuesto_total)
        ejecutado = float(obj.monto_ejecutado_proyecto)
        return presupuesto - ejecutado
    
    def get_porcentaje_ejecutado(self, obj):
        """Calcula el porcentaje ejecutado del proyecto."""
        presupuesto = float(obj.presupuesto_total)
        if presupuesto == 0:
            return 0.0
        ejecutado = float(obj.monto_ejecutado_proyecto)
        return (ejecutado / presupuesto) * 100

class EvidenciaSerializer(serializers.ModelSerializer):
    """Serializador para evidencias, mostrando información del usuario cargador."""
    
    usuario_carga_nombre = serializers.CharField(source='usuario_carga.username', read_only=True)
    archivo_url = serializers.SerializerMethodField()
    tamanio_archivo = serializers.SerializerMethodField()
    
    class Meta:
        model = Evidencia
        fields = '__all__'
        read_only_fields = ['fecha_carga', 'version', 'usuario_carga']
        extra_kwargs = {
            'archivo_path': {'write_only': True},
        }
    
    def get_archivo_url(self, obj):
        """Obtiene la URL del archivo en Supabase Storage o del almacenamiento local."""
        # Prioridad 1: Si ya tiene archivo_url guardada (Supabase), usarla
        if hasattr(obj, 'archivo_url') and obj.archivo_url:
            return obj.archivo_url
        
        # Prioridad 2: Si tiene archivo_path pero no URL, generar una nueva URL de Supabase
        if hasattr(obj, 'archivo_path') and obj.archivo_path:
            try:
                from .storage_service import get_storage_service
                storage_service = get_storage_service()
                return storage_service.get_public_url(obj.archivo_path)
            except:
                pass
        
        # Prioridad 3: Si tiene archivo_evidencia (almacenamiento local legacy), usar esa URL
        if hasattr(obj, 'archivo_evidencia') and obj.archivo_evidencia:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo_evidencia.url)
            return obj.archivo_evidencia.url
        
        return None
    
    def get_tamanio_archivo(self, obj):
        """
        Obtiene el tamaño del archivo.
        
        Nota: Con Supabase Storage, el tamaño no está disponible directamente
        en el modelo. Se podría obtener haciendo una petición a Supabase,
        pero por ahora retornamos None para evitar llamadas adicionales.
        """
        # Con Supabase, el tamaño no está disponible directamente
        # Se podría obtener de los metadatos de Supabase si es necesario
        return None

class TransaccionEvidenciaSerializer(serializers.ModelSerializer):
    """Serializador para la relación transacción-evidencia."""
    
    evidencia = EvidenciaSerializer(read_only=True)
    # Aceptar 'evidencia' directamente (ID) para compatibilidad con el frontend
    evidencia_id = serializers.PrimaryKeyRelatedField(
        queryset=Evidencia.objects.filter(eliminado=False),
        source='evidencia',
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Transaccion_Evidencia
        fields = '__all__'
    
    def to_internal_value(self, data):
        """Permite aceptar 'evidencia' como campo de entrada además de 'evidencia_id'."""
        # Si viene 'evidencia' en lugar de 'evidencia_id', lo mapeamos
        if 'evidencia' in data and 'evidencia_id' not in data:
            data = data.copy()
            data['evidencia_id'] = data.pop('evidencia')
        return super().to_internal_value(data)
    
    def create(self, validated_data):
        """Crea la relación transacción-evidencia."""
        # Verificar que no exista ya esta relación
        transaccion = validated_data.get('transaccion')
        evidencia = validated_data.get('evidencia')
        
        if transaccion and evidencia:
            # Verificar si ya existe esta relación
            existe = Transaccion_Evidencia.objects.filter(
                transaccion=transaccion,
                evidencia=evidencia
            ).exists()
            
            if existe:
                raise serializers.ValidationError({
                    'evidencia': 'Esta evidencia ya está vinculada a esta transacción.'
                })
        
        return super().create(validated_data)

class LogTransaccionSerializer(serializers.ModelSerializer):
    """
    Serializador para logs de transacciones.
    
    Proporciona información completa sobre las acciones realizadas sobre transacciones,
    cumpliendo con el control C005 (Trazabilidad).
    """
    
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    usuario_nombre_completo = serializers.SerializerMethodField()
    accion_display = serializers.CharField(source='get_accion_realizada_display', read_only=True)
    transaccion_nro_documento = serializers.SerializerMethodField()
    transaccion_monto = serializers.SerializerMethodField()
    proyecto_nombre = serializers.SerializerMethodField()
    transaccion_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Log_transaccion
        fields = [
            'id', 'transaccion', 'transaccion_id', 'transaccion_nro_documento', 'transaccion_monto',
            'proyecto_nombre', 'usuario', 'usuario_nombre', 'usuario_nombre_completo',
            'fecha_hora_accion', 'accion_realizada', 'accion_display'
        ]
        read_only_fields = ['fecha_hora_accion']
    
    def get_usuario_nombre_completo(self, obj):
        """Retorna el nombre completo del usuario que realizó la acción."""
        if obj.usuario.first_name or obj.usuario.last_name:
            return f"{obj.usuario.first_name or ''} {obj.usuario.last_name or ''}".strip()
        return obj.usuario.username
    
    def get_transaccion_nro_documento(self, obj):
        """Retorna el número de documento de la transacción, incluso si fue eliminada."""
        if obj.transaccion:
            return obj.transaccion.nro_documento
        return obj.transaccion_nro_documento or 'N/A (eliminada)'
    
    def get_transaccion_monto(self, obj):
        """Retorna el monto de la transacción, incluso si fue eliminada."""
        if obj.transaccion:
            return obj.transaccion.monto_transaccion
        return obj.transaccion_monto
    
    def get_proyecto_nombre(self, obj):
        """Retorna el nombre del proyecto, incluso si la transacción fue eliminada."""
        if obj.transaccion:
            return obj.transaccion.proyecto.nombre_proyecto
        elif obj.proyecto:
            return obj.proyecto.nombre_proyecto
        return 'N/A'
    
    def get_transaccion_id(self, obj):
        """Retorna el ID de la transacción, incluso si fue eliminada."""
        if obj.transaccion:
            return obj.transaccion.id
        return obj.transaccion_id_eliminada

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
    cantidad_evidencias = serializers.SerializerMethodField()
    
    # Se muestran los logs relacionados a la transacción
    logs = LogTransaccionSerializer(many=True, read_only=True)
    
    # Campos calculados
    puede_editar = serializers.SerializerMethodField()
    puede_aprobar = serializers.SerializerMethodField()
    puede_editar_eliminar = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaccion
        fields = '__all__'
        read_only_fields = [
            'fecha_creacion', 'fecha_actualizacion', 'fecha_aprobacion',
            'usuario_aprobador', 'estado_transaccion', 'usuario'
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
    
    def get_cantidad_evidencias(self, obj):
        """Obtiene el conteo de evidencias activas asociadas a la transacción."""
        return Transaccion_Evidencia.objects.filter(
            transaccion=obj,
            evidencia__eliminado=False
        ).count()
    
    def get_puede_editar(self, obj):
        """Indica si la transacción puede ser editada actualmente."""
        return obj.puede_editar()
    
    def get_puede_aprobar(self, obj):
        """Indica si el usuario actual puede aprobar la transacción."""
        request = self.context.get('request')
        if request and request.user:
            return obj.puede_aprobar(request.user)
        return False
    
    def get_puede_editar_eliminar(self, obj):
        """Indica si el usuario actual puede editar o eliminar la transacción."""
        from .permissions import CanEditDeleteTransaction
        request = self.context.get('request')
        if request and request.user:
            permission = CanEditDeleteTransaction()
            return permission.has_object_permission(request, None, obj)
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
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    usuario_nombre_completo = serializers.SerializerMethodField()
    rol_nombre = serializers.CharField(source='rol.nombre_rol', read_only=True)
    proyecto_nombre = serializers.CharField(source='proyecto.nombre_proyecto', read_only=True)
    
    class Meta:
        model = Usuario_Rol_Proyecto
        fields = '__all__'
    
    def get_usuario_nombre_completo(self, obj):
        """Retorna el nombre completo del usuario."""
        if obj.usuario.first_name or obj.usuario.last_name:
            return f"{obj.usuario.first_name or ''} {obj.usuario.last_name or ''}".strip()
        return obj.usuario.username


class EquipoProyectoSerializer(serializers.Serializer):
    """
    Serializador para representar el equipo de un proyecto.
    
    Agrupa usuarios con sus roles en el proyecto.
    """
    usuario_id = serializers.IntegerField(source='usuario.id')
    username = serializers.CharField(source='usuario.username')
    email = serializers.EmailField(source='usuario.email')
    nombre_completo = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    
    def get_nombre_completo(self, obj):
        """Retorna el nombre completo del usuario."""
        usuario = obj.usuario
        if usuario.first_name or usuario.last_name:
            return f"{usuario.first_name or ''} {usuario.last_name or ''}".strip()
        return usuario.username
    
    def get_roles(self, obj):
        """Retorna la lista de roles del usuario en este proyecto."""
        # Este método se llamará con un objeto Usuario_Rol_Proyecto
        # pero necesitamos todos los roles del usuario en el proyecto
        from .models import Usuario_Rol_Proyecto
        
        proyecto = obj.proyecto
        usuario = obj.usuario
        
        roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=usuario,
            proyecto=proyecto
        ).select_related('rol')
        
        return [{'id': urp.rol.id, 'nombre': urp.rol.nombre_rol} for urp in roles]


class AgregarUsuarioEquipoSerializer(serializers.Serializer):
    """
    Serializador para agregar un usuario al equipo de un proyecto.
    """
    usuario_id = serializers.IntegerField(required=True)
    rol_id = serializers.IntegerField(required=True)
    
    def validate_usuario_id(self, value):
        """Valida que el usuario exista y pertenezca a la misma organización."""
        from .models import Usuario
        try:
            usuario = Usuario.objects.get(id=value)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("El usuario no existe.")
        
        # Verificar que el usuario pertenezca a la misma organización
        request = self.context.get('request')
        if request and request.user:
            if not request.user.is_superuser:
                if usuario.id_organizacion != request.user.id_organizacion:
                    raise serializers.ValidationError(
                        "El usuario debe pertenecer a la misma organización."
                    )
        
        return value
    
    def validate_rol_id(self, value):
        """Valida que el rol exista."""
        from .models import Rol
        try:
            Rol.objects.get(id=value)
        except Rol.DoesNotExist:
            raise serializers.ValidationError("El rol no existe.")
        return value


class CambiarRolEquipoSerializer(serializers.Serializer):
    """
    Serializador para cambiar el rol de un usuario en un proyecto.
    """
    rol_id = serializers.IntegerField(required=True)
    
    def validate_rol_id(self, value):
        """Valida que el rol exista."""
        from .models import Rol
        try:
            Rol.objects.get(id=value)
        except Rol.DoesNotExist:
            raise serializers.ValidationError("El rol no existe.")
        return value

class UsuarioSerializer(serializers.ModelSerializer):
    """Serializador para usuarios."""
    
    organizacion_nombre = serializers.CharField(
        source='id_organizacion.nombre_organizacion',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'id_organizacion', 'organizacion_nombre', 'is_superuser', 'is_active', 'usuario_principal']
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


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """
    Serializador para actualizar el perfil personal del usuario.
    
    Solo permite editar campos personales que no afectan el sistema:
    - first_name, last_name, email
    - password (opcional, con confirmación)
    
    No permite editar: username, id_organizacion, is_superuser, is_active
    """
    
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Confirma la nueva contraseña"
    )
    
    class Meta:
        model = Usuario
        fields = ['first_name', 'last_name', 'email', 'password', 'password_confirm']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'email': {'required': False}
        }
    
    def validate_email(self, value):
        """Valida que el email sea único si se proporciona."""
        if value:
            # Normalizar email
            from django.contrib.auth.models import AbstractUser
            value = AbstractUser.objects.normalize_email(value)
            
            # Verificar que no esté en uso por otro usuario
            user = self.instance
            if Usuario.objects.filter(email=value).exclude(pk=user.pk).exists():
                raise serializers.ValidationError("Este email ya está en uso por otro usuario.")
        return value
    
    def validate(self, data):
        """Valida que las contraseñas coincidan si se proporcionan."""
        password = data.get('password')
        password_confirm = data.get('password_confirm')
        
        if password and not password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Debe confirmar la nueva contraseña.'
            })
        
        if password_confirm and not password:
            raise serializers.ValidationError({
                'password': 'Debe proporcionar una nueva contraseña.'
            })
        
        if password and password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError({
                    'password_confirm': 'Las contraseñas no coinciden.'
                })
            
            # Validar longitud mínima de contraseña
            if len(password) < 8:
                raise serializers.ValidationError({
                    'password': 'La contraseña debe tener al menos 8 caracteres.'
                })
        
        return data
    
    def update(self, instance, validated_data):
        """Actualiza el perfil del usuario."""
        password = validated_data.pop('password', None)
        validated_data.pop('password_confirm', None)  # No se guarda
        
        # Actualizar campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Actualizar contraseña si se proporciona
        if password:
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


class InvitacionUsuarioSerializer(serializers.ModelSerializer):
    """
    Serializador para invitaciones de usuarios.
    
    Permite crear invitaciones y listar las invitaciones de una organización.
    """
    
    organizacion_nombre = serializers.CharField(
        source='organizacion.nombre_organizacion',
        read_only=True
    )
    invitado_por_nombre = serializers.SerializerMethodField()
    esta_expirada = serializers.SerializerMethodField()
    puede_ser_aceptada = serializers.SerializerMethodField()
    dias_restantes = serializers.SerializerMethodField()
    
    class Meta:
        model = InvitacionUsuario
        fields = [
            'id', 'email', 'token', 'organizacion', 'organizacion_nombre',
            'invitado_por', 'invitado_por_nombre', 'estado',
            'fecha_invitacion', 'fecha_expiracion', 'fecha_aceptacion',
            'nombre_sugerido', 'apellido_sugerido', 'username_sugerido',
            'esta_expirada', 'puede_ser_aceptada', 'dias_restantes'
        ]
        read_only_fields = ['id', 'token', 'fecha_invitacion', 'fecha_aceptacion', 'invitado_por']
        extra_kwargs = {
            'organizacion': {'required': False},
            'fecha_expiracion': {'required': False}  # Se establece automáticamente en create()
        }
    
    def get_invitado_por_nombre(self, obj):
        """Retorna el nombre completo del usuario que envió la invitación."""
        if obj.invitado_por:
            return obj.invitado_por.get_full_name() or obj.invitado_por.username
        return None
    
    def get_esta_expirada(self, obj):
        """Indica si la invitación está expirada."""
        return obj.esta_expirada()
    
    def get_puede_ser_aceptada(self, obj):
        """Indica si la invitación puede ser aceptada."""
        return obj.puede_ser_aceptada()
    
    def get_dias_restantes(self, obj):
        """Calcula los días restantes hasta la expiración."""
        from django.utils import timezone
        if obj.estado != InvitacionUsuario.ESTADO_PENDIENTE:
            return None
        delta = obj.fecha_expiracion - timezone.now()
        if delta.total_seconds() < 0:
            return 0
        return delta.days
    
    def validate_email(self, value):
        """Valida que el email no esté ya registrado en la organización."""
        # Verificar si ya existe un usuario con ese email en la organización
        request = self.context.get('request')
        if request and request.user:
            organizacion = request.user.id_organizacion
            if organizacion:
                usuario_existente = Usuario.objects.filter(
                    email=value,
                    id_organizacion=organizacion
                ).exists()
                if usuario_existente:
                    raise serializers.ValidationError(
                        "Ya existe un usuario con este email en la organización."
                    )
        return value
    
    def create(self, validated_data):
        """Crea una invitación con token único y fecha de expiración."""
        from django.utils import timezone
        from datetime import timedelta
        
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Usuario no autenticado.")
        
        # Asignar organización del usuario que invita si no se especifica
        if 'organizacion' not in validated_data:
            if not request.user.id_organizacion:
                raise serializers.ValidationError(
                    "Debe especificar una organización o pertenecer a una."
                )
            validated_data['organizacion'] = request.user.id_organizacion
        
        # Asignar usuario que invita
        validated_data['invitado_por'] = request.user
        
        # Establecer fecha de expiración (7 días por defecto)
        if 'fecha_expiracion' not in validated_data:
            validated_data['fecha_expiracion'] = timezone.now() + timedelta(days=7)
        
        return super().create(validated_data)


class AceptarInvitacionSerializer(serializers.Serializer):
    """
    Serializador para aceptar una invitación.
    
    Requiere el token de la invitación y los datos del usuario a crear.
    """
    
    token = serializers.CharField(required=True, write_only=True)
    username = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(required=True, write_only=True, min_length=8)
    password_confirm = serializers.CharField(required=True, write_only=True)
    first_name = serializers.CharField(required=False, max_length=150, allow_blank=True)
    last_name = serializers.CharField(required=False, max_length=150, allow_blank=True)
    
    def validate(self, data):
        """Valida que las contraseñas coincidan."""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })
        return data
    
    def validate_token(self, value):
        """Valida que el token de invitación sea válido y pueda ser aceptado."""
        try:
            invitacion = InvitacionUsuario.objects.get(token=value)
        except InvitacionUsuario.DoesNotExist:
            raise serializers.ValidationError("Token de invitación inválido.")
        
        if not invitacion.puede_ser_aceptada():
            if invitacion.esta_expirada():
                raise serializers.ValidationError("La invitación ha expirado.")
            elif invitacion.estado != InvitacionUsuario.ESTADO_PENDIENTE:
                raise serializers.ValidationError("Esta invitación ya fue procesada.")
        
        return value
    
    def validate_username(self, value):
        """Valida que el username no esté en uso."""
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return value


class InformeGeneradoSerializer(serializers.ModelSerializer):
    """
    Serializador para informes generados.
    
    Incluye información del proyecto y del usuario que generó el informe.
    """
    proyecto_nombre = serializers.CharField(source='proyecto.nombre_proyecto', read_only=True)
    generado_por_nombre = serializers.SerializerMethodField()
    tamaño_display = serializers.CharField(source='get_tamaño_display', read_only=True)
    url_descarga = serializers.SerializerMethodField()
    
    class Meta:
        model = InformeGenerado
        fields = [
            'id', 'proyecto', 'proyecto_nombre', 'tipo_informe', 'formato',
            'nombre_archivo', 'fecha_generacion', 'generado_por', 'generado_por_nombre',
            'descripcion', 'tamaño_archivo', 'tamaño_display', 'url_descarga'
        ]
        read_only_fields = [
            'id', 'fecha_generacion', 'tamaño_archivo', 'archivo'
        ]
    
    def get_generado_por_nombre(self, obj):
        """Retorna el nombre completo del usuario que generó el informe."""
        if obj.generado_por:
            nombre_completo = f"{obj.generado_por.first_name} {obj.generado_por.last_name}".strip()
            return nombre_completo if nombre_completo else obj.generado_por.username
        return "N/A"
    
    def get_url_descarga(self, obj):
        """Retorna la URL para descargar el informe."""
        if obj.archivo:
            return f"/api/informes/{obj.id}/descargar/"
        return None
