from django.db import models

# --- Definición de opciones para PLAN SUSCRIPCIÓN ---
PLAN_MENSUAL = 'mensual'
PLAN_SEMESTRAL = 'semestral'
PLAN_ANUAL = 'anual'
PLAN_CHOICES = [
    (PLAN_MENSUAL, 'Mensual'),
    (PLAN_SEMESTRAL, 'Semestral'),
    (PLAN_ANUAL, 'Anual'),
]

# --- Definición de opciones para ESTADO SUSCRIPCIÓN ---
ESTADO_SUSCRIPCION_ACTIVO = 'activo'
ESTADO_SUSCRIPCION_INACTIVO = 'inactivo'
ESTADO_SUSCRIPCION_SUSPENDIDO = 'suspendido'
ESTADO_SUSCRIPCION_CHOICES = [
    (ESTADO_SUSCRIPCION_INACTIVO, 'Inactivo'),
    (ESTADO_SUSCRIPCION_ACTIVO, 'Activo'),
    (ESTADO_SUSCRIPCION_SUSPENDIDO, 'Suspendido'),
]

# --- Definición de las opciones para el ESTADO DE PROYECTOS ---
ESTADO_PROYECTO_ACTIVO = 'activo'
ESTADO_PROYECTO_COMPLETADO = 'completado'
ESTADO_PROYECTO_EN_PAUSA = 'en_pausa'
ESTADO_PROYECTO_INACTIVO = 'inactivo'
ESTADO_PROYECTO_CHOICES = [
    (ESTADO_PROYECTO_INACTIVO, 'Inactivo'),
    (ESTADO_PROYECTO_ACTIVO, 'Activo'),
    (ESTADO_PROYECTO_COMPLETADO, 'Completado'),
    (ESTADO_PROYECTO_EN_PAUSA, 'En Pausa'), # 'On Hold'
]

class Organizacion(models.Model):
    nombre_organizacion = models.CharField(max_length=100)
    rut_organizacion = models.CharField(max_length=13, unique=True)
    plan_suscripcion = models.CharField(
        max_length=10,
        choices=PLAN_CHOICES,
        default=PLAN_MENSUAL  # Valor por defecto
    )
    estado_suscripcion = models.CharField(
        max_length=10,
        choices=ESTADO_SUSCRIPCION_CHOICES,
        default=ESTADO_SUSCRIPCION_INACTIVO  # Valor por defecto
    )
    fecha_inicio_suscripcion = models.DateField()


class Proyecto(models.Model):
    nombre_proyecto = models.CharField(max_length=100)
    fecha_inicio_proyecto = models.DateField()
    fecha_fin_proyecto = models.DateField()
    presupuesto_total = models.DecimalField(max_digits=12, decimal_places=2)

    # --- Uso de las 'choices' ---
    estado_proyecto = models.CharField(
        max_length=20,
        choices=ESTADO_PROYECTO_CHOICES,
        default=ESTADO_PROYECTO_INACTIVO  # Valor por defecto
    )

    id_organizacion = models.ForeignKey(Organizacion, on_delete=models.CASCADE)

    def __str__(self):
        return self.nombre_proyecto
