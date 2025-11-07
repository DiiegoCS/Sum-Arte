from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views # Importa las vistas de la app api

# Crea un router
router = DefaultRouter()

# Registra el ViewSet de Proyecto en el router
# Esto crea automáticamente las URLs: /proyectos/ y /proyectos/{id}/
router.register(r'proyectos', views.ProyectoViewSet, basename='proyecto')

# Las URLs de la API ahora son determinadas por el router.
urlpatterns = [
    path('', include(router.urls)),
]