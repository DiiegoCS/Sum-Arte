"""
Vistas API para Sum-Arte.

En este módulo se incluyen todos los ViewSets para los endpoints de la API REST,
con la autenticación y autorización adecuadas configuradas.
"""

from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from .models import (Proyecto, Organizacion, Usuario, Rol, Usuario_Rol_Proyecto, Proveedor, Transaccion,
                     Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Log_transaccion,
                     InvitacionUsuario)
from .serializers import (ProyectoSerializer, OrganizacionSerializer,UsuarioSerializer, UsuarioRolProyectoSerializer, ProveedorSerializer, 
                          TransaccionSerializer, EvidenciaSerializer, TransaccionEvidenciaSerializer,
                          LogTransaccionSerializer, ItemPresupuestarioSerializer, SubitemPresupuestarioSerializer, 
                          RolSerializer, InvitacionUsuarioSerializer, AceptarInvitacionSerializer,
                          EquipoProyectoSerializer, AgregarUsuarioEquipoSerializer, CambiarRolEquipoSerializer,
                          PerfilUsuarioSerializer)
from .permissions import (IsOrganizationMember, IsAdminProyecto, IsEjecutor, 
                         IsAdminProyectoOrEjecutor, CanApproveTransaction, CanCreateTransaction,
                         IsAdminProyectoEnOrganizacion, CanEditDeleteTransaction)
from .utils import validar_rut_chileno

class OrganizacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar organizaciones.
    
    - Los usuarios sin organización pueden crear una nueva organización.
    - Los usuarios con organización solo pueden ver/editar la suya.
    - Los superusuarios pueden ver/editar todas las organizaciones.
    """
    queryset = Organizacion.objects.all()
    serializer_class = OrganizacionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra las organizaciones según la organización del usuario."""
        if self.request.user.is_superuser:
            return Organizacion.objects.all()
        if self.request.user.id_organizacion:
            return Organizacion.objects.filter(id=self.request.user.id_organizacion.id)
        # Usuarios sin organización pueden ver todas (para seleccionar al crear)
        return Organizacion.objects.all()
    
    def get_permissions(self):
        """
        Permisos dinámicos según la acción.
        
        - create: Cualquier usuario autenticado puede crear (si no tiene organización)
        - list/retrieve: Usuarios pueden ver su organización o todas si no tienen una
        - update/partial_update/delete: Solo si pertenece a la organización o es superusuario
        """
        if self.action == 'create':
            # Permitir crear a cualquier usuario autenticado
            return [IsAuthenticated()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # Para editar/eliminar, verificar que pertenezca a la organización
            return [IsAuthenticated(), IsOrganizationMember()]
        # Para list y retrieve, solo autenticación
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        """
        Crea la organización y asigna el estado inicial.
        
        Si el usuario no tiene organización, se le asigna automáticamente.
        """
        from django.utils import timezone
        
        # Establecer estado inicial de suscripción
        organizacion = serializer.save(
            estado_suscripcion='inactivo'  # Se activa manualmente o por proceso de pago
        )
        
        # Si el usuario no tiene organización, asignarle la recién creada
        if not self.request.user.id_organizacion:
            self.request.user.id_organizacion = organizacion
            self.request.user.save()
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def verificar_rut(self, request):
        """
        Verifica si un RUT está disponible para registro.
        
        Query params:
            rut: RUT a verificar
            
        Returns:
            {
                "disponible": bool,
                "rut": str,
                "mensaje": str
            }
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        rut = request.query_params.get('rut', '').strip()
        
        if not rut:
            return Response(
                {'error': 'El parámetro "rut" es requerido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar formato de RUT
        es_valido, rut_limpio, mensaje_error = validar_rut_chileno(rut)
        
        if not es_valido:
            return Response(
                {
                    'disponible': False,
                    'rut': rut,
                    'mensaje': mensaje_error
                },
                status=status.HTTP_200_OK
            )
        
        # Verificar disponibilidad
        existe = Organizacion.objects.filter(rut_organizacion=rut_limpio).exists()
        
        return Response(
            {
                'disponible': not existe,
                'rut': rut_limpio,
                'mensaje': 'RUT disponible.' if not existe else 'Este RUT ya está registrado.'
            },
            status=status.HTTP_200_OK
        )


class ProyectoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar proyectos.
    
    Los usuarios solo pueden acceder a proyectos de su organización.
    - Crear: Solo administradores de proyecto en la organización
    - Editar: Solo administradores del proyecto específico
    - Ver: Cualquier miembro de la organización
    """
    serializer_class = ProyectoSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    
    def get_permissions(self):
        """
        Instancia y retorna la lista de permisos que requiere esta vista.
        """
        if self.action == 'create':
            # Solo administradores de proyecto pueden crear proyectos
            permission_classes = [IsAuthenticated, IsAdminProyectoEnOrganizacion]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # Solo administradores del proyecto específico pueden editarlo
            permission_classes = [IsAuthenticated, IsAdminProyecto]
        else:
            # Ver y listar: cualquier miembro de la organización
            permission_classes = [IsAuthenticated, IsOrganizationMember]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filtra los proyectos según la organización del usuario."""
        usuario = self.request.user
        if usuario.is_superuser:
            return Proyecto.objects.all()
        else:
            return Proyecto.objects.filter(id_organizacion=self.request.user.id_organizacion)
    
    def perform_create(self, serializer):
        """
        Asigna automáticamente la organización del usuario al crear el proyecto.
        """
        if not self.request.user.is_superuser:
            # Usuarios normales: asignar automáticamente su organización
            if not hasattr(self.request.user, 'id_organizacion') or not self.request.user.id_organizacion:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'id_organizacion': 'El usuario no tiene una organización asignada.'
                })
            serializer.save(id_organizacion=self.request.user.id_organizacion)
        else:
            # Superusuarios: pueden proporcionar la organización o se asigna automáticamente
            if 'id_organizacion' not in serializer.validated_data:
                # Si no se proporcionó, intentar usar la del usuario si existe
                if hasattr(self.request.user, 'id_organizacion') and self.request.user.id_organizacion:
                    serializer.save(id_organizacion=self.request.user.id_organizacion)
                else:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({
                        'id_organizacion': 'Debe proporcionar una organización para crear el proyecto.'
                    })
            else:
                serializer.save()
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsOrganizationMember])
    def pre_rendicion(self, request, pk=None):
        """
        Valida la integridad del proyecto antes de cerrar la rendición (C008).
        
        Retorna un diccionario con errores y advertencias encontradas.
        """
        from rest_framework.response import Response
        from rest_framework import status
        from .services import RenditionService
        
        proyecto = self.get_object()
        
        # Valida permisos de organización
        if not request.user.is_superuser:
            if proyecto.id_organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para acceder a este proyecto.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            resultado = RenditionService.generar_pre_rendicion(proyecto)
            
            # Obtener información adicional para el frontend
            from .models import Transaccion
            transacciones = Transaccion.objects.filter(proyecto=proyecto)
            
            resultado['resumen'] = {
                'total_transacciones': transacciones.count(),
                'pendientes': transacciones.filter(estado_transaccion='pendiente').count(),
                'aprobadas': transacciones.filter(estado_transaccion='aprobado').count(),
                'rechazadas': transacciones.filter(estado_transaccion='rechazado').count(),
            }
            
            return Response(resultado, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsOrganizationMember])
    def reporte_rendicion_oficial(self, request, pk=None):
        """
        Genera el reporte oficial de rendición en PDF.
        
        Este endpoint solo está disponible para proyectos cerrados/completados.
        
        Returns:
            HttpResponse con el PDF generado
        """
        import logging
        from django.http import HttpResponse
        from django.utils import timezone
        from rest_framework import status
        from rest_framework.response import Response
        from .reports import generar_reporte_rendicion_oficial_pdf
        
        logger = logging.getLogger(__name__)
        
        try:
            proyecto = self.get_object()
            
            # Valida permisos de organización
            if not request.user.is_superuser:
                if proyecto.id_organizacion != request.user.id_organizacion:
                    return Response(
                        {'error': 'No tiene permiso para acceder a este proyecto.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Verificar que el proyecto esté cerrado/completado
            if proyecto.estado_proyecto not in ['completado', 'cerrado']:
                return Response(
                    {'error': 'El proyecto debe estar cerrado o completado para generar el reporte oficial de rendición.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Generando reporte oficial de rendición para proyecto {proyecto.id}")
            buffer = generar_reporte_rendicion_oficial_pdf(proyecto)
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="reporte_rendicion_oficial_{proyecto.id}_{timezone.now().strftime("%Y%m%d")}.pdf"'
            logger.info(f"Reporte oficial generado exitosamente para proyecto {proyecto.id}")
            return response
        except Exception as e:
            logger.error(f"Error al generar reporte oficial para proyecto {pk}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al generar el reporte: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminProyecto])
    def cerrar_rendicion(self, request, pk=None):
        """
        Cierra la rendición del proyecto, bloqueando ediciones futuras (C005, C011).
        
        Requiere que el proyecto pase todas las validaciones de integridad.
        """
        from rest_framework.response import Response
        from rest_framework import status
        from .services import RenditionService
        
        proyecto = self.get_object()
        
        # Valida permisos de organización
        if not request.user.is_superuser:
            if proyecto.id_organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para acceder a este proyecto.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            proyecto_cerrado = RenditionService.cerrar_rendicion(proyecto, request.user)
            serializer = self.get_serializer(proyecto_cerrado)
            return Response(
                {
                    'message': 'Rendición cerrada exitosamente. El proyecto ahora está bloqueado para ediciones.',
                    'proyecto': serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsOrganizationMember])
    def reporte_estado(self, request, pk=None):
        """
        Genera un reporte de estado del proyecto en PDF o Excel.
        
        Query params:
            formato: 'pdf' o 'excel' (default: 'pdf')
            
        Returns:
            HttpResponse con el archivo generado
        """
        import logging
        from django.http import HttpResponse
        from django.utils import timezone
        from rest_framework import status
        from rest_framework.response import Response
        from .reports import generar_reporte_estado_proyecto_pdf, generar_reporte_estado_proyecto_excel
        
        logger = logging.getLogger(__name__)
        
        try:
            proyecto = self.get_object()
            
            # Valida permisos de organización
            if not request.user.is_superuser:
                if proyecto.id_organizacion != request.user.id_organizacion:
                    return Response(
                        {'error': 'No tiene permiso para acceder a este proyecto.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            formato = request.query_params.get('formato', 'pdf').lower()
            
            logger.info(f"Generando reporte {formato} para proyecto {proyecto.id}")
            
            if formato == 'excel':
                buffer = generar_reporte_estado_proyecto_excel(proyecto)
                response = HttpResponse(
                    buffer.getvalue(),
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="reporte_estado_{proyecto.id}_{timezone.now().strftime("%Y%m%d")}.xlsx"'
            else:  # PDF por defecto
                buffer = generar_reporte_estado_proyecto_pdf(proyecto)
                response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="reporte_estado_{proyecto.id}_{timezone.now().strftime("%Y%m%d")}.pdf"'
            
            logger.info(f"Reporte {formato} generado exitosamente para proyecto {proyecto.id}")
            return response
        except Exception as e:
            logger.error(f"Error al generar reporte para proyecto {pk}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al generar el reporte: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsOrganizationMember])
    def equipo(self, request, pk=None):
        """
        Obtiene la lista de usuarios del equipo del proyecto con sus roles.
        
        Returns:
            Lista de usuarios con sus roles en el proyecto
        """
        from rest_framework.response import Response
        from rest_framework import status
        from collections import defaultdict
        
        proyecto = self.get_object()
        
        # Valida permisos de organización
        if not request.user.is_superuser:
            if proyecto.id_organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para acceder a este proyecto.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Obtener todas las asignaciones de usuario-rol-proyecto para este proyecto
        asignaciones = Usuario_Rol_Proyecto.objects.filter(
            proyecto=proyecto
        ).select_related('usuario', 'rol').order_by('usuario__username', 'rol__nombre_rol')
        
        # Agrupar por usuario
        equipo_dict = {}
        for asignacion in asignaciones:
            usuario_id = asignacion.usuario.id
            if usuario_id not in equipo_dict:
                equipo_dict[usuario_id] = {
                    'usuario': asignacion.usuario,
                    'proyecto': proyecto,
                    'roles': []
                }
            equipo_dict[usuario_id]['roles'].append(asignacion.rol)
        
        # Convertir a lista y serializar
        equipo_lista = []
        for usuario_id, datos in equipo_dict.items():
            # Crear un objeto temporal con la primera asignación para el serializer
            primera_asignacion = asignaciones.filter(usuario_id=usuario_id).first()
            serializer = EquipoProyectoSerializer(primera_asignacion)
            equipo_lista.append(serializer.data)
        
        return Response(equipo_lista, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminProyecto])
    def agregar_usuario_equipo(self, request, pk=None):
        """
        Agrega un usuario al equipo del proyecto con un rol específico.
        
        Body:
            {
                "usuario_id": 1,
                "rol_id": 2
            }
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        proyecto = self.get_object()
        
        # Valida permisos de organización
        if not request.user.is_superuser:
            if proyecto.id_organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para acceder a este proyecto.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = AgregarUsuarioEquipoSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        usuario_id = serializer.validated_data['usuario_id']
        rol_id = serializer.validated_data['rol_id']
        
        # Obtener usuario y rol
        from .models import Usuario, Rol
        usuario = Usuario.objects.get(id=usuario_id)
        rol = Rol.objects.get(id=rol_id)
        
        # Verificar que el usuario pertenezca a la misma organización
        if not request.user.is_superuser:
            if usuario.id_organizacion != proyecto.id_organizacion:
                return Response(
                    {'error': 'El usuario debe pertenecer a la misma organización que el proyecto.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Crear o verificar la asignación
        asignacion, created = Usuario_Rol_Proyecto.objects.get_or_create(
            usuario=usuario,
            rol=rol,
            proyecto=proyecto,
            defaults={}
        )
        
        if not created:
            return Response(
                {'mensaje': 'El usuario ya tiene este rol en el proyecto.'},
                status=status.HTTP_200_OK
            )
        
        # Serializar la respuesta
        equipo_serializer = EquipoProyectoSerializer(asignacion)
        return Response(
            {
                'mensaje': 'Usuario agregado al equipo exitosamente.',
                'equipo': equipo_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['delete'], url_path='equipo/(?P<usuario_id>[^/.]+)', permission_classes=[IsAuthenticated, IsAdminProyecto])
    def quitar_usuario_equipo(self, request, pk=None, usuario_id=None):
        """
        Quita un usuario del equipo del proyecto (elimina todas sus asignaciones de roles).
        
        URL: /api/proyectos/{id}/equipo/{usuario_id}/
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        proyecto = self.get_object()
        
        # Valida permisos de organización
        if not request.user.is_superuser:
            if proyecto.id_organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para acceder a este proyecto.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'El usuario no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que el usuario pertenezca a la misma organización
        if not request.user.is_superuser:
            if usuario.id_organizacion != proyecto.id_organizacion:
                return Response(
                    {'error': 'El usuario no pertenece a la organización del proyecto.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Verificar que no sea el último Admin Proyecto
        from .models import ROL_ADMIN_PRYECTO
        admins_proyecto = Usuario_Rol_Proyecto.objects.filter(
            proyecto=proyecto,
            rol__nombre_rol=ROL_ADMIN_PRYECTO
        ).exclude(usuario=usuario)
        
        if Usuario_Rol_Proyecto.objects.filter(
            proyecto=proyecto,
            usuario=usuario,
            rol__nombre_rol=ROL_ADMIN_PRYECTO
        ).exists() and admins_proyecto.count() == 0:
            return Response(
                {'error': 'No se puede quitar al último Admin Proyecto del proyecto.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Eliminar todas las asignaciones del usuario en este proyecto
        eliminadas = Usuario_Rol_Proyecto.objects.filter(
            proyecto=proyecto,
            usuario=usuario
        ).delete()
        
        return Response(
            {
                'mensaje': f'Usuario removido del equipo exitosamente. Se eliminaron {eliminadas[0]} asignación(es).'
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['patch'], url_path='equipo/(?P<usuario_id>[^/.]+)/cambiar_rol', permission_classes=[IsAuthenticated, IsAdminProyecto])
    def cambiar_rol_equipo(self, request, pk=None, usuario_id=None):
        """
        Cambia el rol de un usuario en el proyecto.
        
        Nota: Esto elimina todos los roles actuales y asigna el nuevo rol.
        Si se desea agregar un rol adicional, usar agregar_usuario_equipo.
        
        URL: /api/proyectos/{id}/equipo/{usuario_id}/cambiar_rol/
        Body:
            {
                "rol_id": 2
            }
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        proyecto = self.get_object()
        
        # Valida permisos de organización
        if not request.user.is_superuser:
            if proyecto.id_organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para acceder a este proyecto.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = CambiarRolEquipoSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'El usuario no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        rol_id = serializer.validated_data['rol_id']
        from .models import Rol
        nuevo_rol = Rol.objects.get(id=rol_id)
        
        # Verificar que el usuario pertenezca a la misma organización
        if not request.user.is_superuser:
            if usuario.id_organizacion != proyecto.id_organizacion:
                return Response(
                    {'error': 'El usuario no pertenece a la organización del proyecto.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Si el usuario es el último Admin Proyecto y se intenta cambiar su rol, verificar
        from .models import ROL_ADMIN_PRYECTO
        if Usuario_Rol_Proyecto.objects.filter(
            proyecto=proyecto,
            usuario=usuario,
            rol__nombre_rol=ROL_ADMIN_PRYECTO
        ).exists():
            otros_admins = Usuario_Rol_Proyecto.objects.filter(
                proyecto=proyecto,
                rol__nombre_rol=ROL_ADMIN_PRYECTO
            ).exclude(usuario=usuario)
            
            if otros_admins.count() == 0 and nuevo_rol.nombre_rol != ROL_ADMIN_PRYECTO:
                return Response(
                    {'error': 'No se puede cambiar el rol del último Admin Proyecto.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Eliminar todos los roles actuales del usuario en este proyecto
        Usuario_Rol_Proyecto.objects.filter(
            proyecto=proyecto,
            usuario=usuario
        ).delete()
        
        # Crear la nueva asignación
        nueva_asignacion = Usuario_Rol_Proyecto.objects.create(
            usuario=usuario,
            rol=nuevo_rol,
            proyecto=proyecto
        )
        
        # Serializar la respuesta
        equipo_serializer = EquipoProyectoSerializer(nueva_asignacion)
        return Response(
            {
                'mensaje': 'Rol del usuario actualizado exitosamente.',
                'equipo': equipo_serializer.data
            },
            status=status.HTTP_200_OK
        )


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar usuarios.
    
    Solo los superusuarios pueden crear/editar usuarios.
    Los usuarios pueden ver su propio perfil.
    """
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra los usuarios según la organización del usuario."""
        if self.request.user.is_superuser:
            return Usuario.objects.all()
        if self.request.user.id_organizacion:
            return Usuario.objects.filter(id_organizacion=self.request.user.id_organizacion)
        return Usuario.objects.filter(id=self.request.user.id)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def aceptar_invitacion(self, request):
        """
        Acepta una invitación y crea el usuario.
        
        Body:
            {
                "token": "token_de_invitacion",
                "username": "nombre_usuario",
                "password": "contraseña",
                "password_confirm": "confirmar_contraseña",
                "first_name": "Nombre",
                "last_name": "Apellido"
            }
        """
        from rest_framework.response import Response
        from rest_framework import status
        from django.utils import timezone
        
        serializer = AceptarInvitacionSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        token = serializer.validated_data['token']
        
        try:
            invitacion = InvitacionUsuario.objects.get(token=token)
        except InvitacionUsuario.DoesNotExist:
            return Response(
                {'error': 'Token de invitación inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que la invitación pueda ser aceptada
        if not invitacion.puede_ser_aceptada():
            if invitacion.esta_expirada():
                return Response(
                    {'error': 'La invitación ha expirado.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'error': 'Esta invitación ya fue procesada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear el usuario
        try:
            usuario = Usuario.objects.create_user(
                username=serializer.validated_data['username'],
                email=invitacion.email,
                password=serializer.validated_data['password'],
                first_name=serializer.validated_data.get('first_name') or invitacion.nombre_sugerido or '',
                last_name=serializer.validated_data.get('last_name') or invitacion.apellido_sugerido or '',
                id_organizacion=invitacion.organizacion
            )
            
            # Marcar invitación como aceptada
            invitacion.estado = InvitacionUsuario.ESTADO_ACEPTADA
            invitacion.fecha_aceptacion = timezone.now()
            invitacion.save()
            
            return Response(
                {
                    'mensaje': 'Invitación aceptada exitosamente. Ya puedes iniciar sesión.',
                    'usuario_id': usuario.id,
                    'username': usuario.username
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': f'Error al crear el usuario: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def mi_perfil(self, request):
        """
        Obtiene o actualiza el perfil del usuario autenticado.
        
        GET: Retorna los datos del perfil del usuario actual.
        PATCH: Actualiza solo los campos personales (first_name, last_name, email, password).
        
        Campos permitidos para editar:
        - first_name
        - last_name
        - email
        - password (requiere password_confirm)
        
        Campos NO editables desde aquí:
        - username
        - id_organizacion
        - is_superuser
        - is_active
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        usuario = request.user
        
        if request.method == 'GET':
            serializer = UsuarioSerializer(usuario)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            serializer = PerfilUsuarioSerializer(usuario, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                # Retornar datos actualizados con UsuarioSerializer
                usuario.refresh_from_db()
                response_serializer = UsuarioSerializer(usuario)
                return Response(
                    {
                        'mensaje': 'Perfil actualizado exitosamente.',
                        'usuario': response_serializer.data
                    },
                    status=status.HTTP_200_OK
                )
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InvitacionUsuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar invitaciones de usuarios.
    
    Los usuarios pueden ver las invitaciones de su organización y crear nuevas.
    Solo el usuario que creó la invitación o un admin puede cancelarla.
    """
    queryset = InvitacionUsuario.objects.all()
    serializer_class = InvitacionUsuarioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra las invitaciones según la organización del usuario."""
        if self.request.user.is_superuser:
            return InvitacionUsuario.objects.all()
        if self.request.user.id_organizacion:
            return InvitacionUsuario.objects.filter(
                organizacion=self.request.user.id_organizacion
            )
        return InvitacionUsuario.objects.none()
    
    def get_serializer_context(self):
        """Agrega el request al contexto del serializer."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Crea la invitación y marca invitaciones expiradas."""
        # Marcar invitaciones expiradas antes de crear una nueva
        from django.utils import timezone
        InvitacionUsuario.objects.filter(
            organizacion=self.request.user.id_organizacion,
            estado=InvitacionUsuario.ESTADO_PENDIENTE,
            fecha_expiracion__lt=timezone.now()
        ).update(estado=InvitacionUsuario.ESTADO_EXPIRADA)
        
        serializer.save()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reenviar(self, request, pk=None):
        """
        Reenvía una invitación generando un nuevo token y fecha de expiración.
        
        Solo puede ser reenviada si está pendiente o expirada.
        """
        from rest_framework.response import Response
        from rest_framework import status
        from django.utils import timezone
        from datetime import timedelta
        import secrets
        
        invitacion = self.get_object()
        
        # Verificar permisos
        if not request.user.is_superuser:
            if invitacion.organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para reenviar esta invitación.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Solo se pueden reenviar invitaciones pendientes o expiradas
        if invitacion.estado not in [InvitacionUsuario.ESTADO_PENDIENTE, InvitacionUsuario.ESTADO_EXPIRADA]:
            return Response(
                {'error': 'Solo se pueden reenviar invitaciones pendientes o expiradas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generar nuevo token y fecha de expiración
        invitacion.token = secrets.token_urlsafe(32)
        invitacion.fecha_expiracion = timezone.now() + timedelta(days=7)
        invitacion.estado = InvitacionUsuario.ESTADO_PENDIENTE
        invitacion.save()
        
        serializer = self.get_serializer(invitacion)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancelar(self, request, pk=None):
        """
        Cancela una invitación pendiente.
        
        Solo puede ser cancelada por quien la creó o un admin de la organización.
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        invitacion = self.get_object()
        
        # Verificar permisos
        if not request.user.is_superuser:
            if invitacion.organizacion != request.user.id_organizacion:
                return Response(
                    {'error': 'No tiene permiso para cancelar esta invitación.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        if invitacion.estado != InvitacionUsuario.ESTADO_PENDIENTE:
            return Response(
                {'error': 'Solo se pueden cancelar invitaciones pendientes.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invitacion.estado = InvitacionUsuario.ESTADO_CANCELADA
        invitacion.save()
        
        serializer = self.get_serializer(invitacion)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RolViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar roles.
    
    Los roles solo son editables por superusuarios. El resto solo tiene acceso a solo lectura.
    """
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [IsAuthenticated]


class UsuarioRolProyectoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar asignaciones de usuario-rol-proyecto.
    
    Solo el admin de proyecto o superusuarios pueden gestionar estas asignaciones.
    """
    queryset = Usuario_Rol_Proyecto.objects.all()
    serializer_class = UsuarioRolProyectoSerializer
    permission_classes = [IsAuthenticated, IsAdminProyectoOrEjecutor]


class ProveedorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar proveedores.
    
    Los usuarios pueden administrar proveedores para los proyectos de su organización.
    """
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]


class TransaccionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar transacciones (egresos e ingresos).
    
    - El ejecutor y el admin de proyecto pueden crear transacciones.
    - El admin de proyecto puede aprobar/rechazar transacciones.
    - El admin de proyecto puede editar/eliminar transacciones.
    - Los usuarios pueden ver transacciones de los proyectos de su organización.
    """
    queryset = Transaccion.objects.all()
    serializer_class = TransaccionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['proyecto', 'estado_transaccion', 'tipo_transaccion', 'proveedor']
    search_fields = ['nro_documento', 'proveedor__nombre_proveedor']
    ordering_fields = ['fecha_registro', 'fecha_creacion', 'monto_transaccion']
    ordering = ['-fecha_registro']
    
    def get_permissions(self):
        """
        Permisos dinámicos según la acción.
        
        - create: CanCreateTransaction
        - update/partial_update/destroy: CanEditDeleteTransaction (solo admin proyecto)
        - approve/reject: CanApproveTransaction
        - list/retrieve: IsAuthenticated
        """
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanEditDeleteTransaction()]
        elif self.action in ['approve', 'reject']:
            return [IsAuthenticated(), CanApproveTransaction()]
        elif self.action == 'create':
            return [IsAuthenticated(), CanCreateTransaction()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filtra las transacciones según la organización del usuario."""
        queryset = Transaccion.objects.select_related(
            'proyecto', 'usuario', 'proveedor', 'item_presupuestario',
            'subitem_presupuestario', 'usuario_aprobador'
        ).prefetch_related(
            'transaccion_evidencia_set__evidencia',
            'log_transaccion_set__usuario'
        )
        
        if self.request.user.is_superuser:
            return queryset
        # Filtra por organización mediante los proyectos asociados
        return queryset.filter(
            proyecto__id_organizacion=self.request.user.id_organizacion
        )
    
    def get_serializer_context(self):
        """Agrega el request al contexto del serializador."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        """
        Crea una nueva transacción en estado 'pendiente'.
        
        Utiliza TransactionService para manejar la lógica de negocio y validaciones.
        """
        from .services import TransactionService
        from rest_framework.response import Response
        from rest_framework import status
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Utiliza el servicio para crear la transacción
            transaccion = TransactionService.crear_transaccion(
                serializer.validated_data,
                request.user
            )
            
            # Serializa la respuesta
            response_serializer = self.get_serializer(transaccion)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """
        Actualiza una transacción.
        
        Solo permite actualizar si:
        - El usuario es Administrador de Proyecto
        - La transacción está en estado 'pendiente'
        - El proyecto no está bloqueado
        """
        from rest_framework.response import Response
        from rest_framework import status
        from .validators import validar_proyecto_no_bloqueado, validar_duplicidad
        from .exceptions import ProyectoBloqueadoException, TransaccionDuplicadaException
        
        instance = self.get_object()
        
        # Verifica si la transacción puede ser editada
        if not instance.puede_editar():
            return Response(
                {'error': 'No se puede modificar una transacción que ya ha sido aprobada o rechazada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verifica que el proyecto no esté bloqueado
        try:
            validar_proyecto_no_bloqueado(instance.proyecto)
        except ProyectoBloqueadoException as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        # Validar duplicidad si cambió proveedor o nro_documento
        validated_data = serializer.validated_data
        nuevo_proveedor = validated_data.get('proveedor', instance.proveedor)
        nuevo_nro_documento = validated_data.get('nro_documento', instance.nro_documento)
        
        # Asegurarse de que tenemos instancias de Proveedor para comparar
        if hasattr(nuevo_proveedor, 'id'):
            nuevo_proveedor_id = nuevo_proveedor.id
        else:
            nuevo_proveedor_id = nuevo_proveedor
        
        if nuevo_proveedor_id != instance.proveedor.id or nuevo_nro_documento != instance.nro_documento:
            try:
                # Asegurarse de que tenemos una instancia de Proveedor
                if not hasattr(nuevo_proveedor, 'id'):
                    from .models import Proveedor
                    nuevo_proveedor = Proveedor.objects.get(id=nuevo_proveedor_id)
                validar_duplicidad(nuevo_proveedor, nuevo_nro_documento, transaccion_id=instance.id)
            except TransaccionDuplicadaException as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            self.perform_update(serializer)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Elimina una transacción.
        
        Solo permite eliminar si:
        - El usuario es Administrador de Proyecto
        - Si la transacción está aprobada, se revierten los montos ejecutados
        - El proyecto no está bloqueado (solo para transacciones aprobadas)
        """
        from rest_framework.response import Response
        from rest_framework import status
        from .validators import validar_proyecto_no_bloqueado
        from .exceptions import ProyectoBloqueadoException
        from django.db import transaction as db_transaction
        
        instance = self.get_object()
        
        # Si la transacción está aprobada, verificar que el proyecto no esté bloqueado
        if instance.estado_transaccion == 'aprobado':
            try:
                validar_proyecto_no_bloqueado(instance.proyecto)
            except ProyectoBloqueadoException as e:
                return Response(
                    {'error': f'No se puede eliminar una transacción aprobada de un proyecto bloqueado: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            with db_transaction.atomic():
                # Si está aprobada, revertir los montos ejecutados
                if instance.estado_transaccion == 'aprobado':
                    # Revertir montos (restar en lugar de sumar)
                    monto = instance.monto_transaccion
                    
                    if instance.subitem_presupuestario:
                        subitem = instance.subitem_presupuestario
                        from decimal import Decimal
                        subitem.monto_ejecutado_subitem = Decimal(str(subitem.monto_ejecutado_subitem)) - monto
                        subitem.save()
                        
                        item = subitem.item_presupuesto
                        item.monto_ejecutado_item = Decimal(str(item.monto_ejecutado_item)) - monto
                        item.save()
                    elif instance.item_presupuestario:
                        item = instance.item_presupuestario
                        from decimal import Decimal
                        item.monto_ejecutado_item = Decimal(str(item.monto_ejecutado_item)) - monto
                        item.save()
                    
                    # Revertir monto ejecutado del proyecto
                    proyecto = instance.proyecto
                    from decimal import Decimal
                    if instance.tipo_transaccion == 'egreso':
                        proyecto.monto_ejecutado_proyecto = Decimal(str(proyecto.monto_ejecutado_proyecto)) - monto
                    else:  # Si es ingreso
                        proyecto.presupuesto_total = Decimal(str(proyecto.presupuesto_total)) - monto
                    proyecto.save()
                
                # Crear log de eliminación ANTES de eliminar la transacción
                # Guardar información de la transacción para mantener trazabilidad
                from .models import Log_transaccion, ACCION_LOG_DELETE
                usuario_accion = getattr(instance, '_usuario_accion', None) or request.user
                if usuario_accion:
                    Log_transaccion.objects.create(
                        transaccion=instance,  # Se establecerá como null después de eliminar
                        transaccion_id_eliminada=instance.id,
                        transaccion_nro_documento=instance.nro_documento,
                        transaccion_monto=instance.monto_transaccion,
                        proyecto=instance.proyecto,
                        usuario=usuario_accion,
                        accion_realizada=ACCION_LOG_DELETE
                    )
                
                # Eliminar la transacción
                instance.delete()
                
                return Response(
                    {'message': 'Transacción eliminada exitosamente.'},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            return Response(
                {'error': f'Error al eliminar la transacción: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTransaction])
    def approve(self, request, pk=None):
        """
        Aprueba una transacción.
        
        Esta acción:
        - Valida los controles de negocio (C001, C006, C011)
        - Actualiza los montos ejecutados del presupuesto
        - Crea el log de aprobación de la transacción
        - Implementa segregación de funciones
        """
        from .services import TransactionService
        from rest_framework.response import Response
        from rest_framework import status
        
        transaccion = self.get_object()
        
        try:
            transaccion_aprobada = TransactionService.aprobar_transaccion(
                transaccion,
                request.user
            )
            
            serializer = self.get_serializer(transaccion_aprobada)
            return Response(
                {
                    'message': 'Transacción aprobada exitosamente.',
                    'data': serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTransaction])
    def reject(self, request, pk=None):
        """
        Rechaza una transacción.
        
        Esta acción:
        - Cambia el estado de la transacción a 'rechazado'
        - Crea un log de rechazo
        """
        from .services import TransactionService
        from rest_framework.response import Response
        from rest_framework import status
        
        transaccion = self.get_object()
        motivo = request.data.get('motivo', None)
        
        try:
            transaccion_rechazada = TransactionService.rechazar_transaccion(
                transaccion,
                request.user,
                motivo
            )
            
            serializer = self.get_serializer(transaccion_rechazada)
            return Response(
                {
                    'message': 'Transacción rechazada exitosamente.',
                    'data': serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pendientes(self, request):
        """
        Obtiene todas las transacciones pendientes de aprobación que el usuario puede aprobar.
        
        Retorna las transacciones en estado 'pendiente' que el usuario puede aprobar.
        """
        from rest_framework.response import Response
        
        queryset = self.get_queryset().filter(estado_transaccion='pendiente')
        
        # Filtra por proyecto si se indica
        proyecto_id = request.query_params.get('proyecto', None)
        if proyecto_id:
            queryset = queryset.filter(proyecto_id=proyecto_id)
        
        # Excluye las transacciones creadas por el usuario actual (segregación de funciones)
        queryset = queryset.exclude(usuario=request.user)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class EvidenciaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar documentos de evidencia.
    
    Los usuarios pueden subir y administrar evidencias para los proyectos de su organización.
    Soporta eliminación lógica (soft delete) y validaciones de archivo (C010).
    """
    queryset = Evidencia.objects.all()
    serializer_class = EvidenciaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra la evidencia según la organización del usuario y excluye eliminadas por defecto."""
        queryset = Evidencia.objects.all()
        
        # Filtra por organización
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                proyecto__id_organizacion=self.request.user.id_organizacion
            )
        
        # Por defecto, excluye evidencias eliminadas (soft delete)
        # Se puede incluir con ?incluir_eliminadas=true
        incluir_eliminadas = self.request.query_params.get('incluir_eliminadas', 'false').lower() == 'true'
        if not incluir_eliminadas:
            queryset = queryset.filter(eliminado=False)
        
        return queryset
    
    def get_serializer_context(self):
        """Agrega el request al contexto del serializador."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        """
        Crea una nueva evidencia con validaciones de archivo (C010).
        
        Sube el archivo a Supabase Storage y guarda la referencia en la base de datos.
        Valida:
        - Tipo de archivo permitido
        - Tamaño máximo del archivo
        - Asigna automáticamente el usuario_carga
        """
        from rest_framework.response import Response
        from rest_framework import status
        from .constants import ALLOWED_EVIDENCE_TYPES, MAX_EVIDENCE_FILE_SIZE
        from .storage_service import get_storage_service
        
        # Valida el archivo antes de procesar
        archivo = request.FILES.get('archivo_evidencia')
        if not archivo:
            return Response(
                {'error': 'Debe proporcionar un archivo de evidencia.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Valida el tipo de archivo (C010)
        tipo_archivo = archivo.content_type
        if tipo_archivo not in ALLOWED_EVIDENCE_TYPES:
            tipos_permitidos = ', '.join(ALLOWED_EVIDENCE_TYPES)
            return Response(
                {'error': f'Tipo de archivo no permitido. Tipos permitidos: {tipos_permitidos}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Valida el tamaño del archivo (C010)
        if archivo.size > MAX_EVIDENCE_FILE_SIZE:
            tamaño_mb = MAX_EVIDENCE_FILE_SIZE / (1024 * 1024)
            return Response(
                {'error': f'El archivo excede el tamaño máximo permitido de {tamaño_mb} MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Sube el archivo a Supabase Storage
            storage_service = get_storage_service()
            nombre_evidencia = request.data.get('nombre_evidencia', archivo.name)
            
            upload_result = storage_service.upload_file(
                file=archivo,
                file_name=nombre_evidencia,
                folder='evidencias',
                content_type=tipo_archivo
            )
            
            # Prepara los datos para el serializer (sin el archivo, ya que está en Supabase)
            data = request.data.copy()
            data['archivo_path'] = upload_result['path']
            data['archivo_url'] = upload_result['url']
            data['tipo_archivo'] = tipo_archivo
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            # Asigna automáticamente el usuario que carga la evidencia
            evidencia = serializer.save(usuario_carga=request.user)
            
            response_serializer = self.get_serializer(evidencia)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            # Error de configuración de Supabase
            return Response(
                {'error': f'Error de configuración: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            # Error al subir el archivo
            return Response(
                {'error': f'Error al subir el archivo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='procesar-ocr', permission_classes=[IsAuthenticated])
    def procesar_ocr(self, request):
        """
        Procesa un documento usando OCR con Google Gemini Vision API.
        
        Extrae información estructurada de facturas, boletas, etc.
        
        Body (multipart/form-data):
            - archivo: Archivo de imagen o PDF a procesar
            
        Returns:
            JSON con la información extraída del documento
        """
        from rest_framework.response import Response
        from rest_framework import status
        from .ocr_service import OCRService
        
        if 'archivo' not in request.FILES:
            return Response(
                {'error': 'No se proporcionó ningún archivo.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        archivo = request.FILES['archivo']
        
        # Validar tipo de archivo
        tipos_permitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if archivo.content_type not in tipos_permitidos:
            return Response(
                {'error': f'Tipo de archivo no permitido. Tipos permitidos: {", ".join(tipos_permitidos)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar tamaño (máximo 10MB)
        if archivo.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'El archivo es demasiado grande. Tamaño máximo: 10MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Leer el contenido del archivo
            archivo.seek(0)
            image_data = archivo.read()
            
            # Procesar con OCR
            ocr_service = OCRService()
            resultado = ocr_service.process_document(
                image_data=image_data,
                mime_type=archivo.content_type
            )
            
            return Response(resultado, status=status.HTTP_200_OK)
            
        except ValueError as e:
            # Error de configuración (API key no configurada)
            return Response(
                {'error': f'Error de configuración: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            # Log del error completo para debugging
            import traceback
            error_traceback = traceback.format_exc()
            print(f"Error en procesar_ocr: {error_traceback}")  # Para ver en logs de Docker
            
            return Response(
                {
                    'error': f'Error al procesar el documento: {str(e)}',
                    'detalle': str(e)  # Incluir detalles adicionales
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Realiza eliminación lógica (soft delete) de la evidencia.
        
        En lugar de eliminar físicamente el archivo, marca la evidencia como eliminada
        para mantener la trazabilidad (C005).
        """
        from rest_framework.response import Response
        from rest_framework import status
        from django.utils import timezone
        
        evidencia = self.get_object()
        
        if evidencia.eliminado:
            return Response(
                {'error': 'La evidencia ya ha sido eliminada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Realiza soft delete
        evidencia.soft_delete(request.user)
        
        return Response(
            {'message': 'Evidencia eliminada correctamente (eliminación lógica).'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], url_path='restaurar')
    def restaurar(self, request, pk=None):
        """
        Restaura una evidencia que fue eliminada lógicamente.
        
        Solo puede restaurarse si fue eliminada previamente.
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        evidencia = self.get_object()
        
        if not evidencia.eliminado:
            return Response(
                {'error': 'La evidencia no está eliminada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Restaura la evidencia
        evidencia.eliminado = False
        evidencia.fecha_eliminacion = None
        evidencia.usuario_eliminacion = None
        evidencia.save()
        
        response_serializer = self.get_serializer(evidencia)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class TransaccionEvidenciaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las relaciones de transacción-evidencia.
    
    Los usuarios pueden asociar evidencias a las transacciones de los proyectos de su organización.
    """
    queryset = Transaccion_Evidencia.objects.all()
    serializer_class = TransaccionEvidenciaSerializer
    permission_classes = [IsAuthenticated]


class LogTransaccionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar los logs de transacciones (auditoría).
    
    Los logs son solo de lectura, y se crean automáticamente por el sistema.
    Proporciona trazabilidad completa de todas las acciones sobre transacciones (C005).
    """
    queryset = Log_transaccion.objects.all()
    serializer_class = LogTransaccionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['transaccion', 'usuario', 'accion_realizada']
    ordering_fields = ['fecha_hora_accion']
    ordering = ['-fecha_hora_accion']  # Más recientes primero
    
    def get_queryset(self):
        """
        Filtra los logs según la organización del usuario.
        
        Permite filtrar por:
        - transaccion: ID de transacción
        - usuario: ID de usuario
        - accion_realizada: Tipo de acción (creacion, modificacion, aprobacion, etc.)
        - proyecto: ID de proyecto (filtro personalizado)
        """
        queryset = Log_transaccion.objects.select_related(
            'transaccion', 'usuario', 'transaccion__proyecto'
        )
        
        if self.request.user.is_superuser:
            queryset = queryset.all()
        else:
            queryset = queryset.filter(
                transaccion__proyecto__id_organizacion=self.request.user.id_organizacion
            )
        
        # Filtro adicional por proyecto si se especifica
        proyecto_id = self.request.query_params.get('proyecto', None)
        if proyecto_id:
            queryset = queryset.filter(transaccion__proyecto_id=proyecto_id)
        
        return queryset
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def por_transaccion(self, request):
        """
        Obtiene todos los logs de una transacción específica.
        
        Query params:
            transaccion_id: ID de la transacción
            
        Returns:
            Lista de logs ordenados por fecha (más recientes primero)
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        transaccion_id = request.query_params.get('transaccion_id', None)
        
        if not transaccion_id:
            return Response(
                {'error': 'El parámetro "transaccion_id" es requerido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verificar que la transacción pertenezca a la organización del usuario
            from .models import Transaccion
            transaccion = Transaccion.objects.get(id=transaccion_id)
            
            if not request.user.is_superuser:
                if transaccion.proyecto.id_organizacion != request.user.id_organizacion:
                    return Response(
                        {'error': 'No tiene permiso para acceder a esta transacción.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            logs = Log_transaccion.objects.filter(
                transaccion_id=transaccion_id
            ).select_related('usuario').order_by('-fecha_hora_accion')
            
            serializer = self.get_serializer(logs, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Transaccion.DoesNotExist:
            return Response(
                {'error': 'La transacción no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )


class ItemPresupuestarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar ítems presupuestarios.
    
    Los usuarios pueden administrar ítems presupuestarios de los proyectos de su organización.
    """
    serializer_class = ItemPresupuestarioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra los ítems presupuestarios por proyecto y organización."""
        # Usar el related_name 'subitems' que definimos en el modelo
        queryset = Item_Presupuestario.objects.prefetch_related(
            'subitems'
        ).all()
        
        # Filtra por organización
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                proyecto__id_organizacion=self.request.user.id_organizacion
            )
        
        # Filtra por proyecto si se indica
        proyecto_id = self.request.query_params.get('proyecto')
        if proyecto_id is not None:
            queryset = queryset.filter(proyecto=proyecto_id)
            
        return queryset


class SubitemPresupuestarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar subítems presupuestarios.
    
    Los usuarios pueden administrar subítems presupuestarios de los proyectos de su organización.
    """
    queryset = Subitem_Presupuestario.objects.all()
    serializer_class = SubitemPresupuestarioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra los subítems según la organización del usuario."""
        if self.request.user.is_superuser:
            return Subitem_Presupuestario.objects.all()
        return Subitem_Presupuestario.objects.filter(
            item_presupuesto__proyecto__id_organizacion=self.request.user.id_organizacion
        )


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet para métricas y analítica del dashboard.
    
    Proporciona endpoints para el dashboard ejecutivo con métricas de ejecución presupuestaria,
    egresos por ítem y estado de rendición.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """
        Obtiene las métricas del dashboard para todos los proyectos del usuario.
        
        Retorna:
            - Porcentaje de ejecución presupuestaria
            - Gastos por ítem
            - Estado de rendición
            - Resumen de proyectos
        """
        from rest_framework.response import Response
        from .services import BudgetService
        from .models import Proyecto, Transaccion
        
        # Obtiene los proyectos del usuario
        if request.user.is_superuser:
            proyectos = Proyecto.objects.all()
        else:
            proyectos = Proyecto.objects.filter(
                id_organizacion=request.user.id_organizacion
            )
        
        # Calcula las métricas generales
        total_presupuesto = sum(p.presupuesto_total for p in proyectos)
        total_ejecutado = sum(p.monto_ejecutado_proyecto for p in proyectos)
        porcentaje_ejecutado = (total_ejecutado / total_presupuesto * 100) if total_presupuesto > 0 else 0
        
        # Obtiene los egresos por ítem en todos los proyectos
        transacciones_aprobadas = Transaccion.objects.filter(
            proyecto__in=proyectos,
            estado_transaccion='aprobado',
            tipo_transaccion='egreso'
        ).select_related('item_presupuestario')
        
        gastos_por_item = {}
        for transaccion in transacciones_aprobadas:
            if transaccion.item_presupuestario:
                item_nombre = transaccion.item_presupuestario.nombre_item_presupuesto
                if item_nombre not in gastos_por_item:
                    gastos_por_item[item_nombre] = 0
                gastos_por_item[item_nombre] += float(transaccion.monto_transaccion)
        
        # Resumen por proyecto
        proyectos_data = []
        for proyecto in proyectos:
            metricas = BudgetService.calcular_metricas_presupuesto(proyecto)
            proyectos_data.append({
                'id': proyecto.id,
                'nombre': proyecto.nombre_proyecto,
                'estado': proyecto.estado_proyecto,
                'estado_display': proyecto.get_estado_proyecto_display(),
                **metricas
            })
        
        # Estado de las rendiciones
        proyectos_en_rendicion = proyectos.filter(estado_proyecto='en_rendicion').count()
        proyectos_completados = proyectos.filter(estado_proyecto='completado').count()
        
        return Response({
            'resumen_general': {
                'total_proyectos': proyectos.count(),
                'presupuesto_total': float(total_presupuesto),
                'monto_ejecutado': float(total_ejecutado),
                'monto_disponible': float(total_presupuesto - total_ejecutado),
                'porcentaje_ejecutado': round(porcentaje_ejecutado, 2)
            },
            'gastos_por_item': [
                {'item': item, 'monto': monto}
                for item, monto in sorted(gastos_por_item.items(), key=lambda x: x[1], reverse=True)
            ],
            'estado_rendiciones': {
                'en_rendicion': proyectos_en_rendicion,
                'completados': proyectos_completados,
                'activos': proyectos.filter(estado_proyecto='activo').count()
            },
            'proyectos': proyectos_data
        })
    
    @action(detail=False, methods=['get'], url_path='proyecto/(?P<proyecto_id>[^/.]+)/metrics')
    def proyecto_metrics(self, request, proyecto_id=None):
        """
        Obtiene métricas detalladas para un proyecto específico.
        
        Retorna desglose del presupuesto, egresos por ítem y resumen de transacciones.
        """
        from rest_framework.response import Response
        from rest_framework import status
        from .services import BudgetService
        
        try:
            proyecto = Proyecto.objects.get(id=proyecto_id)
            
            # Valida los permisos
            if not request.user.is_superuser:
                if proyecto.id_organizacion != request.user.id_organizacion:
                    return Response(
                        {'error': 'No tiene permiso para acceder a este proyecto.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Obtiene las métricas
            metricas = BudgetService.calcular_metricas_presupuesto(proyecto)
            gastos_por_item = BudgetService.obtener_gastos_por_item(proyecto)
            
            # Resumen de transacciones
            transacciones = Transaccion.objects.filter(proyecto=proyecto)
            resumen_transacciones = {
                'total': transacciones.count(),
                'pendientes': transacciones.filter(estado_transaccion='pendiente').count(),
                'aprobadas': transacciones.filter(estado_transaccion='aprobado').count(),
                'rechazadas': transacciones.filter(estado_transaccion='rechazado').count(),
                'ingresos': transacciones.filter(tipo_transaccion='ingreso', estado_transaccion='aprobado').count(),
                'egresos': transacciones.filter(tipo_transaccion='egreso', estado_transaccion='aprobado').count()
            }
            
            return Response({
                'proyecto': {
                    'id': proyecto.id,
                    'nombre': proyecto.nombre_proyecto,
                    'estado': proyecto.estado_proyecto,
                    'estado_display': proyecto.get_estado_proyecto_display()
                },
                'metricas_presupuesto': metricas,
                'gastos_por_item': gastos_por_item,
                'resumen_transacciones': resumen_transacciones
            })
        except Proyecto.DoesNotExist:
            return Response(
                {'error': 'Proyecto no encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )




