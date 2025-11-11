from django.db import models
from django.contrib.auth.models import AbstractUser


### --------- Modelos Gestión Usuarios y configuración principal  --------- ###

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

    def __str__(self):
        return self.nombre_organizacion

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

class Proyecto(models.Model):
    nombre_proyecto = models.CharField(max_length=100)
    fecha_inicio_proyecto = models.DateField()
    fecha_fin_proyecto = models.DateField()
    presupuesto_total = models.DecimalField(max_digits=12, decimal_places=2)
    monto_ejecutado_proyecto = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # --- Uso de las 'choices' ---
    estado_proyecto = models.CharField(
        max_length=20,
        choices=ESTADO_PROYECTO_CHOICES,
        default=ESTADO_PROYECTO_INACTIVO  # Valor por defecto
    )

    id_organizacion = models.ForeignKey(Organizacion, on_delete=models.CASCADE)

    def __str__(self):
        return self.nombre_proyecto

class Usuario(AbstractUser):
   # --- Nosotros solo agregamos lo que es único de Sum-Arte ---
    id_organizacion = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE,
        null=True,  # Permitimos que esté vacío (importante para el superusuario)
        blank=True
    )

    def __str__(self):
        return self.username

ROL_SUPERADMIN = 'superadmin'
ROL_ADMIN_PRYECTO = 'admin proyecto'
ROL_EJECUTOR = 'ejecutor'
ROL_AUDITOR = 'auditor'
ROL_DIRECTIVO = 'directivo'
ROL_CHOICES = [
    (ROL_SUPERADMIN, 'Superadmin'),
    (ROL_ADMIN_PRYECTO, 'Admin Proyecto'),
    (ROL_EJECUTOR, 'Ejecutor'),
    (ROL_AUDITOR, 'Auditor'),
    (ROL_DIRECTIVO, 'Directivo'),
]

class Rol(models.Model):
    nombre_rol = models.CharField(
        max_length=20
        , choices=ROL_CHOICES,
        default=ROL_EJECUTOR  # Valor por defecto
    )
    descripcion_rol = models.TextField()
    
    def __str__(self):
        return self.nombre_rol
    
class Usuario_Rol_Proyecto(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE)
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('usuario', 'rol', 'proyecto')

    def __str__(self):
        return f"{self.usuario.username} - {self.proyecto.nombre_proyecto} - {self.rol.nombre_rol}"


## --- Modelos para gestión de Proveedores y Transacciones ---

class Proveedor(models.Model):
    nombre_proveedor = models.CharField(max_length=100)
    rut_proveedor = models.CharField(max_length=13, unique=True)
    email_proveedor = models.EmailField()

    def __str__(self):
        return self.nombre_proveedor
    
TIPO_DOC_FACTURA_ELECTRONICA = 'factura electrónica'
TIPO_DOC_FACTURA_EXENTA = 'factura exenta'
TIPO_DOC_BOLETA_COMPRA = 'boleta de compra'
TIPO_DOC_BOLETA_HONORARIOS = 'boleta de honorarios'
TIPO_DOC_CHOICES = [
    (TIPO_DOC_FACTURA_ELECTRONICA, 'Factura Electrónica'),
    (TIPO_DOC_FACTURA_EXENTA, 'Factura Exenta'),
    (TIPO_DOC_BOLETA_COMPRA, 'Boleta de Compra'),
    (TIPO_DOC_BOLETA_HONORARIOS, 'Boleta de Honorarios'),
]

class Transaccion(models.Model):
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    monto_transaccion = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_registro = models.DateField()
    nro_documento = models.CharField(max_length=50)
    tipo_doc_transaccion = models.CharField(
        max_length=50,
        choices=TIPO_DOC_CHOICES,
        default=TIPO_DOC_FACTURA_ELECTRONICA  # Valor por defecto
    )

    class Meta:
        unique_together = ('proveedor', 'nro_documento')
    
    def __str__(self):
        return f"{self.proyecto.nombre_proyecto} - {self.nro_documento}"

### --- Evidencia y trazabilidad ---

class Evidencia(models.Model):
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE)
    archivo_evidencia = models.FileField(upload_to='evidencias/')
    tipo_archivo = models.CharField(max_length=50)
    fecha_carga = models.DateTimeField(auto_now_add=True)
    nombre_evidencia = models.CharField(max_length=255)

class Transaccion_Evidencia(models.Model):
    transaccion = models.ForeignKey(Transaccion, on_delete=models.CASCADE)
    evidencia = models.ForeignKey(Evidencia, on_delete=models.CASCADE)

ACCION_LOG_CREACION = 'creacion'
ACCION_LOG_MODIFICACION = 'modificacion'
ACCION_LOG_DELETE = 'eliminacion'
ACCION_LOG_APROBACION = 'aprobacion'
ACCION_LOG_RECHAZO = 'rechazo'
ACCION_LOG_CHOICES = [
    (ACCION_LOG_CREACION, 'Creación'),
    (ACCION_LOG_MODIFICACION, 'Modificación'),
    (ACCION_LOG_DELETE, 'Eliminación'),
    (ACCION_LOG_APROBACION, 'Aprobación'),
    (ACCION_LOG_RECHAZO, 'Rechazo'),
]

class Log_transaccion(models.Model):
    transaccion = models.ForeignKey(Transaccion, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    fecha_hora_accion = models.DateTimeField(auto_now_add=True)
    accion_realizada = models.CharField(
        max_length=15, 
        choices=ACCION_LOG_CHOICES,
        default=ACCION_LOG_CREACION  # Valor por defecto
        )
    
### --- Modelos Gestión Financiera y Presupuesto --- 

class Item_Presupuestario(models.Model):
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE)
    nombre_item_presupuesto = models.CharField(max_length=100)
    monto_asignado_item = models.DecimalField(max_digits=12, decimal_places=2)
    monto_ejecutado_item = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.proyecto.nombre_proyecto} - {self.nombre_item_presupuesto}"
    
class Subitem_Presupuestario(models.Model):
    item_presupuesto = models.ForeignKey(Item_Presupuestario, on_delete=models.CASCADE)
    nombre_subitem_presupuesto = models.CharField(max_length=100)
    monto_asignado_subitem = models.DecimalField(max_digits=12, decimal_places=2)
    monto_ejecutado_subitem = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.item_presupuesto.nombre_item_presupuesto} - {self.nombre_subitem_presupuesto}"
