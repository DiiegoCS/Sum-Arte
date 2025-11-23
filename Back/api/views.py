from django.shortcuts import render
from rest_framework import viewsets
from .models import (Proyecto, Organizacion, Usuario, Rol, Usuario_Rol_Proyecto, Proveedor, Transaccion,
                     Item_Presupuestario, Subitem_Presupuestario, Evidencia, Transaccion_Evidencia, Log_transaccion)
from .serializers import (ProyectoSerializer, OrganizacionSerializer,UsuarioSerializer, UsuarioRolProyectoSerializer, ProveedorSerializer, 
                          TransaccionSerializer, EvidenciaSerializer, TransaccionEvidenciaSerializer,
                          LogTransaccionSerializer, ItemPresupuestarioSerializer, SubitemPresupuestarioSerializer, 
                          RolSerializer)
from rest_framework.permissions import AllowAny

class OrganizacionViewSet(viewsets.ModelViewSet):
    queryset = Organizacion.objects.all()
    serializer_class = OrganizacionSerializer

class ProyectoViewSet(viewsets.ModelViewSet):
    serializer_class = ProyectoSerializer
    def get_queryset(self):
        usuario = self.request.user
        if usuario.is_superuser:
            return Proyecto.objects.all()
        else:
            return Proyecto.objects.filter(id_organizacion=self.request.user.id_organizacion)

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer

class UsuarioRolProyectoViewSet(viewsets.ModelViewSet):
    queryset = Usuario_Rol_Proyecto.objects.all()
    serializer_class = UsuarioRolProyectoSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer

class TransaccionViewSet(viewsets.ModelViewSet):
    queryset = Transaccion.objects.all()
    serializer_class = TransaccionSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

class EvidenciaViewSet(viewsets.ModelViewSet):
    queryset = Evidencia.objects.all()
    serializer_class = EvidenciaSerializer

class TransaccionEvidenciaViewSet(viewsets.ModelViewSet):
    queryset = Transaccion_Evidencia.objects.all()
    serializer_class = TransaccionEvidenciaSerializer

class LogTransaccionViewSet(viewsets.ModelViewSet):
    queryset = Log_transaccion.objects.all()
    serializer_class = LogTransaccionSerializer

class ItemPresupuestarioViewSet(viewsets.ModelViewSet):
    serializer_class = ItemPresupuestarioSerializer
    def get_queryset(self):
        queryset = Item_Presupuestario.objects.all()
        # Busca el parámetro 'proyecto' en la URL
        proyecto_id = self.request.query_params.get('proyecto')
        # Si existe, filtra
        if proyecto_id is not None:
            queryset = queryset.filter(proyecto=proyecto_id)
        return queryset

class SubitemPresupuestarioViewSet(viewsets.ModelViewSet):
    queryset = Subitem_Presupuestario.objects.all()
    serializer_class = SubitemPresupuestarioSerializer




