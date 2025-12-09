"""
Clases de permisos para la API de Sum-Arte.

Este módulo proporciona permisos basados en roles y restringidos por organización,
para controlar el acceso a los recursos de la API según los roles del usuario y
los límites organizacionales.
"""

from rest_framework import permissions
from rest_framework.permissions import BasePermission
from .models import (
    Usuario_Rol_Proyecto, Rol, Proyecto,
    ROL_ADMIN_PRYECTO, ROL_EJECUTOR, ROL_AUDITOR, ROL_DIRECTIVO
)
from .utils import obtener_organizacion_usuario, tiene_acceso_completo


class IsOrganizationMember(BasePermission):
    """
    Clase de permiso que verifica si el usuario pertenece a la misma
    organización que el recurso al que intenta acceder.
    
    Los superusuarios omiten esta verificación y tienen acceso a todos los recursos.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el usuario tiene permiso para acceder al objeto.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            obj: El objeto que se accede (puede ser Proyecto, Organizacion, etc.)
            
        Returns:
            bool: True si el usuario tiene acceso completo o pertenece a la misma organización que obj,
                  False en caso contrario
        """
        organizacion = obtener_organizacion_usuario(request.user)
        
        # Los superusuarios sin organización tienen acceso a todo
        if tiene_acceso_completo(request.user):
            return True
            
        # Verifica si el objeto tiene atributo de organización
        if hasattr(obj, 'id_organizacion'):
            return obj.id_organizacion == organizacion
            
        # Para objetos que pertenecen a un proyecto, verifica la organización del proyecto
        if hasattr(obj, 'proyecto'):
            return obj.proyecto.id_organizacion == organizacion
            
        # Para proyectos, verifica directamente
        if isinstance(obj, Proyecto):
            return obj.id_organizacion == organizacion
            
        return False


class HasProjectRole(BasePermission):
    """
    Clase base de permiso que verifica si el usuario tiene un rol específico
    en un proyecto.
    
    Se utiliza como base para permisos más específicos basados en roles.
    """
    
    # Sobrescribir esto en las subclases
    required_roles = []
    
    def has_permission(self, request, view):
        """
        Verifica si el usuario tiene el rol requerido globalmente.
        
        Los superusuarios sin organización siempre tienen permiso.
        """
        if tiene_acceso_completo(request.user):
            return True
        return True  # La verificación a nivel de objeto se realiza en has_object_permission
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el usuario tiene el rol requerido para el objeto específico.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            obj: El objeto al que se accede (usualmente un Proyecto u objeto relacionado)
            
        Returns:
            bool: True si el usuario tiene alguno de los roles requeridos en el proyecto,
                  False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
            
        # Obtiene el proyecto desde el objeto
        proyecto = None
        if isinstance(obj, Proyecto):
            proyecto = obj
        elif hasattr(obj, 'proyecto'):
            proyecto = obj.proyecto
        else:
            return False
            
        # Verifica si el usuario tiene alguno de los roles requeridos en este proyecto
        user_roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto,
            rol__nombre_rol__in=self.required_roles
        )
        
        return user_roles.exists()


class IsAdminProyecto(HasProjectRole):
    """
    Clase de permiso que verifica si el usuario es Administrador de Proyecto
    para el proyecto correspondiente.
    """
    required_roles = [ROL_ADMIN_PRYECTO]


class IsAdminProyectoEnOrganizacion(BasePermission):
    """
    Clase de permiso que verifica si el usuario puede crear proyectos.
    
    Permite crear proyectos a:
    - Superusuarios sin organización
    - Usuarios principales (pueden crear el primer proyecto de una organización nueva)
    - Administradores de proyecto en al menos un proyecto de su organización
    - Directivos en al menos un proyecto de su organización
    """
    
    def has_permission(self, request, view):
        """
        Verifica si el usuario puede crear proyectos.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            
        Returns:
            bool: True si el usuario:
                  - Tiene acceso completo (superusuario sin organización), o
                  - Es usuario principal (puede crear el primer proyecto), o
                  - Tiene rol de administrador de proyecto en al menos un proyecto de su organización, o
                  - Tiene rol de directivo en al menos un proyecto de su organización
                  False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
        
        if not request.user.is_authenticated:
            return False
        
        # Los usuarios principales pueden crear proyectos (especialmente el primer proyecto)
        if getattr(request.user, 'usuario_principal', False):
            return True
        
        # Verifica si el usuario tiene el rol de administrador de proyecto o directivo
        # en al menos un proyecto de su organización
        organizacion = obtener_organizacion_usuario(request.user)
        if not organizacion:
            return False
        
        user_roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto__id_organizacion=organizacion,
            rol__nombre_rol__in=[ROL_ADMIN_PRYECTO, ROL_DIRECTIVO]
        )
        
        return user_roles.exists()


class IsEjecutor(HasProjectRole):
    """
    Clase de permiso que verifica si el usuario es Ejecutor para el proyecto.
    """
    required_roles = [ROL_EJECUTOR]


class IsAuditor(HasProjectRole):
    """
    Clase de permiso que verifica si el usuario es Auditor para el proyecto.
    """
    required_roles = [ROL_AUDITOR]


class IsDirectivo(HasProjectRole):
    """
    Clase de permiso que verifica si el usuario es Directivo para el proyecto.
    """
    required_roles = [ROL_DIRECTIVO]


class IsAdminProyectoOrEjecutor(HasProjectRole):
    """
    Clase de permiso que verifica si el usuario es Administrador de Proyecto
    o Ejecutor para el proyecto.
    """
    required_roles = [ROL_ADMIN_PRYECTO, ROL_EJECUTOR]


class IsAdminProyectoOrDirectivo(HasProjectRole):
    """
    Clase de permiso que verifica si el usuario es Administrador de Proyecto
    o Directivo para el proyecto.
    """
    required_roles = [ROL_ADMIN_PRYECTO, ROL_DIRECTIVO]


class CanApproveTransaction(BasePermission):
    """
    Clase de permiso que verifica si el usuario puede aprobar transacciones.
    
    Requisitos:
    - El usuario debe ser Administrador de Proyecto para el proyecto
    - El usuario debe ser distinto del creador de la transacción (segregación de funciones)
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el usuario puede aprobar la transacción específica.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            obj: El objeto Transaccion a aprobar
            
        Returns:
            bool: True si el usuario puede aprobar la transacción (es admin del proyecto
                  y no es el creador), False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
            
        # Verifica si el usuario es Administrador de Proyecto para este proyecto
        is_admin = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=obj.proyecto,
            rol__nombre_rol=ROL_ADMIN_PRYECTO
        ).exists()
        
        if not is_admin:
            return False
            
        # Segregación de funciones: quien aprueba debe ser distinto del creador
        if obj.usuario == request.user:
            return False
            
        return True


class CanCreateTransaction(BasePermission):
    """
    Clase de permiso que verifica si el usuario puede crear transacciones.
    
    Requisitos:
    - El usuario debe ser Ejecutor o Administrador de Proyecto para el proyecto
    """
    
    def has_permission(self, request, view):
        """
        Verifica si el usuario puede crear transacciones.
        
        Para creación (POST), se valida aquí mismo usando el proyecto indicado en el payload.
        Solo Admin de Proyecto o Ejecutor del proyecto pueden crear.
        """
        if tiene_acceso_completo(request.user):
            return True
        
        if not request.user.is_authenticated:
            return False
        
        # Solo aplica a creación; para otras acciones se evalúa en has_object_permission
        if request.method != 'POST':
            return True
        
        proyecto_id = request.data.get('proyecto') or request.data.get('proyecto_id')
        if not proyecto_id:
            return False
        
        try:
            from .models import Proyecto
            proyecto = Proyecto.objects.get(id=proyecto_id)
        except Proyecto.DoesNotExist:
            return False
        
        # Validar organización
        organizacion = obtener_organizacion_usuario(request.user)
        if not tiene_acceso_completo(request.user):
            if not organizacion or proyecto.id_organizacion != organizacion:
                return False
        
        # Verificar rol en el proyecto (solo Admin Proyecto o Ejecutor)
        user_roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto,
            rol__nombre_rol__in=[ROL_EJECUTOR, ROL_ADMIN_PRYECTO]
        )
        return user_roles.exists()
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el usuario puede crear transacciones para este proyecto.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            obj: El objeto Proyecto para el cual se quiere crear la transacción
            
        Returns:
            bool: True si el usuario tiene acceso completo o tiene rol de Ejecutor o
                  Administrador de Proyecto en el proyecto, False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
            
        if isinstance(obj, Proyecto):
            proyecto = obj
        else:
            return False
            
        # Verifica si el usuario es Ejecutor o Administrador de Proyecto
        user_roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto,
            rol__nombre_rol__in=[ROL_EJECUTOR, ROL_ADMIN_PRYECTO]
        )
        
        return user_roles.exists()


class CanViewDashboard(BasePermission):
    """
    Clase de permiso que verifica si el usuario puede ver las métricas del dashboard.
    
    Requisitos:
    - El usuario debe tener cualquier rol en al menos un proyecto
    - O debe ser superusuario
    """
    
    def has_permission(self, request, view):
        """
        Verifica si el usuario puede ver el dashboard.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            
        Returns:
            bool: True si el usuario tiene acceso completo o tiene algún rol en algún proyecto,
                  False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
            
        # Verifica si el usuario tiene algún rol en algún proyecto
        has_role = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user
        ).exists()
        
        return has_role


class CanEditDeleteTransaction(BasePermission):
    """
    Clase de permiso que verifica si el usuario puede editar o eliminar transacciones.
    
    Requisitos:
    - El usuario debe ser Administrador de Proyecto para el proyecto de la transacción
    - La transacción debe estar en estado 'pendiente' para ser editada
    - Para eliminar, se permite si es admin del proyecto (incluso si está aprobada, 
      pero se debe revertir el presupuesto)
    """
    
    def has_permission(self, request, view):
        """
        Verifica si el usuario tiene permiso para realizar la acción.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            
        Returns:
            bool: True si el usuario tiene acceso completo o está autenticado (la verificación específica
                  se hace en has_object_permission), False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el usuario puede editar o eliminar la transacción específica.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            obj: El objeto Transaccion a editar/eliminar
            
        Returns:
            bool: True si el usuario tiene acceso completo o es admin del proyecto,
                  False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
            
        # Verifica si el usuario es Administrador de Proyecto para este proyecto
        is_admin = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=obj.proyecto,
            rol__nombre_rol=ROL_ADMIN_PRYECTO
        ).exists()
        
        return is_admin


class CanGenerateReports(BasePermission):
    """
    Clase de permiso que verifica si el usuario puede generar informes.
    
    Requisitos:
    - El usuario debe ser Administrador de Proyecto o Directivo para el proyecto
    - Los Auditores NO pueden generar informes, solo consultarlos
    """
    
    def has_permission(self, request, view):
        """
        Verifica si el usuario tiene permiso para generar informes.
        
        Primero verifica si el usuario es auditor (y lo rechaza inmediatamente),
        luego verifica si tiene los roles necesarios en el proyecto.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            
        Returns:
            bool: True si el usuario tiene acceso completo o tiene rol de Admin Proyecto
                  o Directivo en el proyecto, False en caso contrario (incluyendo auditores)
        """
        if tiene_acceso_completo(request.user):
            return True
        
        if not request.user.is_authenticated:
            return False
        
        # Obtener el ID del proyecto de la URL
        proyecto_id = view.kwargs.get('pk')
        if not proyecto_id:
            # Si no hay proyecto_id, permitir que has_object_permission lo verifique
            return True
        
        try:
            proyecto = Proyecto.objects.get(id=proyecto_id)
        except Proyecto.DoesNotExist:
            return False
        
        # Verificar si el usuario es auditor - si lo es, rechazar inmediatamente
        is_auditor = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto,
            rol__nombre_rol=ROL_AUDITOR
        ).exists()
        
        if is_auditor:
            return False
        
        # Verificar si el usuario es Administrador de Proyecto o Directivo
        user_roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto,
            rol__nombre_rol__in=[ROL_ADMIN_PRYECTO, ROL_DIRECTIVO]
        )
        
        return user_roles.exists()
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el usuario puede generar informes para este proyecto.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            obj: El objeto Proyecto para el cual se quiere generar el informe
            
        Returns:
            bool: True si el usuario tiene acceso completo o tiene rol de Admin Proyecto
                  o Directivo en el proyecto, False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
            
        if isinstance(obj, Proyecto):
            proyecto = obj
        elif hasattr(obj, 'proyecto'):
            proyecto = obj.proyecto
        else:
            return False
        
        # Verificar si el usuario es auditor - si lo es, rechazar inmediatamente
        is_auditor = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto,
            rol__nombre_rol=ROL_AUDITOR
        ).exists()
        
        if is_auditor:
            return False
            
        # Verifica si el usuario es Administrador de Proyecto o Directivo
        user_roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto,
            rol__nombre_rol__in=[ROL_ADMIN_PRYECTO, ROL_DIRECTIVO]
        )
        
        return user_roles.exists()


class CanViewReports(BasePermission):
    """
    Clase de permiso que verifica si el usuario puede ver y descargar informes generados.
    
    Requisitos:
    - El usuario debe tener cualquier rol en el proyecto (Admin, Ejecutor, Directivo, Auditor)
    - Todos los roles con acceso al proyecto pueden ver y descargar informes generados
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el usuario puede ver/descargar informes para este proyecto.
        
        Args:
            request: El objeto request de Django REST Framework
            view: La vista a la que se accede
            obj: El objeto (Proyecto o InformeGenerado) para el cual se quiere acceder
            
        Returns:
            bool: True si el usuario tiene acceso completo o tiene cualquier rol en el proyecto,
                  False en caso contrario
        """
        if tiene_acceso_completo(request.user):
            return True
            
        # Obtener el proyecto desde el objeto
        proyecto = None
        if isinstance(obj, Proyecto):
            proyecto = obj
        elif hasattr(obj, 'proyecto'):
            proyecto = obj.proyecto
        else:
            return False
            
        # Verifica si el usuario tiene cualquier rol en el proyecto
        user_roles = Usuario_Rol_Proyecto.objects.filter(
            usuario=request.user,
            proyecto=proyecto
        )
        
        return user_roles.exists()

