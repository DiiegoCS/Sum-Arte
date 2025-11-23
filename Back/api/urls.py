from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views 

# Crea un router
router = DefaultRouter()

# Registra todos nuestros ViewSets en el router
router.register(r'organizaciones', views.OrganizacionViewSet, basename='organizacion')
router.register(r'proyectos', views.ProyectoViewSet, basename='proyecto')
router.register(r'usuarios', views.UsuarioViewSet, basename='usuario')
router.register(r'roles', views.RolViewSet, basename='rol')
router.register(r'usuarios-roles', views.UsuarioRolProyectoViewSet, basename='usuariorolproyecto')
router.register(r'proveedores', views.ProveedorViewSet, basename='proveedor')
router.register(r'transacciones', views.TransaccionViewSet, basename='transaccion')
router.register(r'evidencias', views.EvidenciaViewSet, basename='evidencia')
router.register(r'transacciones-evidencias', views.TransaccionEvidenciaViewSet, basename='transaccionevidencia')
router.register(r'logs-transacciones', views.LogTransaccionViewSet, basename='logtransaccion')
router.register(r'items-presupuestarios', views.ItemPresupuestarioViewSet, basename='itempresupuestario')
router.register(r'subitems-presupuestarios', views.SubitemPresupuestarioViewSet, basename='subitempresupuestario')


# Las URLs de la API ahora son determinadas por el router.
urlpatterns = [
    path('', include(router.urls)),
]