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
                     Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Log_transaccion)
from .serializers import (ProyectoSerializer, OrganizacionSerializer,UsuarioSerializer, UsuarioRolProyectoSerializer, ProveedorSerializer, 
                          TransaccionSerializer, EvidenciaSerializer, TransaccionEvidenciaSerializer,
                          LogTransaccionSerializer, ItemPresupuestarioSerializer, SubitemPresupuestarioSerializer, 
                          RolSerializer)
from .permissions import (IsOrganizationMember, IsAdminProyecto, IsEjecutor, 
                         IsAdminProyectoOrEjecutor, CanApproveTransaction, CanCreateTransaction)

class OrganizacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar organizaciones.
    
    Solo los superusuarios pueden crear/editar organizaciones.
    Los usuarios regulares solo pueden ver su propia organización.
    """
    queryset = Organizacion.objects.all()
    serializer_class = OrganizacionSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    
    def get_queryset(self):
        """Filtra las organizaciones según la organización del usuario."""
        if self.request.user.is_superuser:
            return Organizacion.objects.all()
        if self.request.user.id_organizacion:
            return Organizacion.objects.filter(id=self.request.user.id_organizacion.id)
        return Organizacion.objects.none()


class ProyectoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar proyectos.
    
    Los usuarios solo pueden acceder a proyectos de su organización.
    """
    serializer_class = ProyectoSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    
    def get_queryset(self):
        """Filtra los proyectos según la organización del usuario."""
        usuario = self.request.user
        if usuario.is_superuser:
            return Proyecto.objects.all()
        else:
            return Proyecto.objects.filter(id_organizacion=self.request.user.id_organizacion)


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
    - Los usuarios pueden ver transacciones de los proyectos de su organización.
    """
    queryset = Transaccion.objects.all()
    serializer_class = TransaccionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['proyecto', 'estado_transaccion', 'tipo_transaccion', 'proveedor']
    search_fields = ['nro_documento', 'proveedor__nombre_proveedor']
    ordering_fields = ['fecha_registro', 'fecha_creacion', 'monto_transaccion']
    ordering = ['-fecha_registro']
    
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
        
        Solo permite actualizar si la transacción está en estado 'pendiente'.
        """
        from rest_framework.response import Response
        from rest_framework import status
        
        instance = self.get_object()
        
        # Verifica si la transacción puede ser editada
        if not instance.puede_editar():
            return Response(
                {'error': 'No se puede modificar una transacción que ya ha sido aprobada o rechazada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_update(serializer)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
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
        
        Valida:
        - Tipo de archivo permitido
        - Tamaño máximo del archivo
        - Asigna automáticamente el usuario_carga
        """
        from rest_framework.response import Response
        from rest_framework import status
        from django.core.exceptions import ValidationError
        from .constants import ALLOWED_EVIDENCE_TYPES, MAX_EVIDENCE_FILE_SIZE
        from .validators import validar_almacenamiento_respaldo
        
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
        
        # Prepara los datos para el serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Asigna automáticamente el usuario que carga la evidencia
        evidencia = serializer.save(usuario_carga=request.user)
        
        # Valida el almacenamiento con respaldo (C010)
        try:
            validar_almacenamiento_respaldo(evidencia)
        except ValidationError as e:
            # Si falla la validación, elimina el archivo subido
            evidencia.archivo_evidencia.delete()
            evidencia.delete()
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        response_serializer = self.get_serializer(evidencia)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
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
    """
    queryset = Log_transaccion.objects.all()
    serializer_class = LogTransaccionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra los logs según la organización del usuario."""
        if self.request.user.is_superuser:
            return Log_transaccion.objects.all()
        return Log_transaccion.objects.filter(
            transaccion__proyecto__id_organizacion=self.request.user.id_organizacion
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
        queryset = Item_Presupuestario.objects.all()
        
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




