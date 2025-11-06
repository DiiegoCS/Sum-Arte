from rest_framework import serializers
from .models import Proyecto, Organizacion

class OrganizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizacion
        fields = '__all__'

class ProyectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proyecto
        fields = '__all__'

