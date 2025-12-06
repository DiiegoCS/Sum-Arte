from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from . import views 
from .authentication import CustomTokenObtainPairView

# Crea un router
router = DefaultRouter()

# Registra todos nuestros ViewSets en el router
router.register(r'organizaciones', views.OrganizacionViewSet, basename='organizacion')
router.register(r'proyectos', views.ProyectoViewSet, basename='proyecto')
router.register(r'usuarios', views.UsuarioViewSet, basename='usuario')
router.register(r'invitaciones', views.InvitacionUsuarioViewSet, basename='invitacion')
router.register(r'roles', views.RolViewSet, basename='rol')
router.register(r'usuarios-roles', views.UsuarioRolProyectoViewSet, basename='usuariorolproyecto')
router.register(r'proveedores', views.ProveedorViewSet, basename='proveedor')
router.register(r'transacciones', views.TransaccionViewSet, basename='transaccion')
router.register(r'evidencias', views.EvidenciaViewSet, basename='evidencia')
router.register(r'transacciones-evidencias', views.TransaccionEvidenciaViewSet, basename='transaccionevidencia')
router.register(r'logs-transacciones', views.LogTransaccionViewSet, basename='logtransaccion')
router.register(r'items-presupuestarios', views.ItemPresupuestarioViewSet, basename='itempresupuestario')
router.register(r'subitems-presupuestarios', views.SubitemPresupuestarioViewSet, basename='subitempresupuestario')
router.register(r'dashboard', views.DashboardViewSet, basename='dashboard')
router.register(r'informes', views.InformeGeneradoViewSet, basename='informe')


# Las URLs de la API ahora son determinadas por el router.
urlpatterns = [
    # JWT Authentication endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # API endpoints
    path('', include(router.urls)),
]