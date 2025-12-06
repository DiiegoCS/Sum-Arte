"""
Módulo de autenticación para la API de Sum-Arte.

En este módulo se proporciona autenticación JWT con payload personalizado del token,
incluyendo información de la organización del usuario para propósitos de autorización.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializador personalizado de tokens JWT que agrega información de la organización del usuario
    al payload del token.

    Esto permite que el frontend acceda a los datos de la organización del usuario sin
    realizar llamadas API adicionales.
    """

    @classmethod
    def get_token(cls, user):
        """
        Genera un token JWT con datos personalizados.

        Argumentos:
            user: Instancia del usuario que solicita el token

        Retorna:
            Objeto Token con datos personalizados, incluyendo:
            - user_id: ID del usuario
            - username: nombre de usuario
            - email: correo electrónico del usuario
            - organizacion_id: ID de la organización a la que pertenece el usuario (si existe)
            - is_superuser: Si el usuario es superusuario
        """
        token = super().get_token(user)

        # Agrega datos personalizados al payload del token
        token['user_id'] = user.id
        token['username'] = user.username
        token['email'] = user.email
        token['is_superuser'] = user.is_superuser
        token['usuario_principal'] = getattr(user, 'usuario_principal', False)

        # Agrega el ID de la organización si el usuario pertenece a una
        if user.id_organizacion:
            token['organizacion_id'] = user.id_organizacion.id
        else:
            token['organizacion_id'] = None

        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para obtener el token utilizando el serializador personalizado.

    Esta vista maneja las peticiones POST a /api/token/ y retorna
    tanto el access como el refresh token con datos personalizados.
    """
    serializer_class = CustomTokenObtainPairSerializer

