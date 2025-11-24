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

# --- Definición de opciones para TIPO DE TRANSACCIÓN ---
TIPO_TRANSACCION_INGRESO = 'ingreso'
TIPO_TRANSACCION_EGRESO = 'egreso'
TIPO_TRANSACCION_CHOICES = [
    (TIPO_TRANSACCION_INGRESO, 'Ingreso'),
    (TIPO_TRANSACCION_EGRESO, 'Egreso'),
]

# --- Definición de opciones para ESTADO DE TRANSACCIÓN ---
ESTADO_TRANSACCION_PENDIENTE = 'pendiente'
ESTADO_TRANSACCION_APROBADO = 'aprobado'
ESTADO_TRANSACCION_RECHAZADO = 'rechazado'
ESTADO_TRANSACCION_CHOICES = [
    (ESTADO_TRANSACCION_PENDIENTE, 'Pendiente'),
    (ESTADO_TRANSACCION_APROBADO, 'Aprobado'),
    (ESTADO_TRANSACCION_RECHAZADO, 'Rechazado'),
]

class Transaccion(models.Model):
    """
    Modelo para transacciones financieras (ingresos y egresos).
    
    Las transacciones pasan por un flujo de aprobación:
    1. Creadas en estado 'pendiente' por un Ejecutor
    2. Aprobadas o rechazadas por un Admin Proyecto (diferente al creador)
    3. Una vez aprobadas, se actualizan los montos ejecutados del presupuesto
    """
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, db_index=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='transacciones_creadas', db_index=True)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_index=True)
    monto_transaccion = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_registro = models.DateField(db_index=True)
    nro_documento = models.CharField(max_length=50)
    tipo_doc_transaccion = models.CharField(
        max_length=50,
        choices=TIPO_DOC_CHOICES,
        default=TIPO_DOC_FACTURA_ELECTRONICA
    )
    
    # Nuevos campos para el flujo de aprobación
    tipo_transaccion = models.CharField(
        max_length=10,
        choices=TIPO_TRANSACCION_CHOICES,
        default=TIPO_TRANSACCION_EGRESO,
        help_text="Indica si es un ingreso o egreso"
    )
    estado_transaccion = models.CharField(
        max_length=15,
        choices=ESTADO_TRANSACCION_CHOICES,
        default=ESTADO_TRANSACCION_PENDIENTE,
        db_index=True,
        help_text="Estado de la transacción en el flujo de aprobación"
    )
    fecha_aprobacion = models.DateTimeField(null=True, blank=True, help_text="Fecha y hora de aprobación")
    usuario_aprobador = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transacciones_aprobadas',
        help_text="Usuario que aprobó la transacción"
    )
    
    # Relación con ítems presupuestarios
    item_presupuestario = models.ForeignKey(
        'Item_Presupuestario',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='transacciones',
        help_text="Ítem presupuestario asociado a esta transacción"
    )
    subitem_presupuestario = models.ForeignKey(
        'Subitem_Presupuestario',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='transacciones',
        help_text="Subítem presupuestario asociado a esta transacción"
    )
    
    # Categoría del gasto para validación (C006)
    categoria_gasto = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Categoría del gasto para validar contra el ítem presupuestario"
    )
    
    # Datos para conciliación bancaria (C004)
    numero_cuenta_bancaria = models.CharField(max_length=50, null=True, blank=True)
    numero_operacion_bancaria = models.CharField(max_length=50, null=True, blank=True)
    
    # Timestamps
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('proveedor', 'nro_documento')
        indexes = [
            models.Index(fields=['proyecto', 'estado_transaccion']),
            models.Index(fields=['fecha_registro', 'tipo_transaccion']),
        ]
        ordering = ['-fecha_registro', '-fecha_creacion']
    
    def __str__(self):
        return f"{self.proyecto.nombre_proyecto} - {self.nro_documento} - {self.get_estado_transaccion_display()}"
    
    def puede_editar(self):
        """
        Verifica si la transacción puede ser editada.
        
        Solo se pueden editar transacciones en estado 'pendiente'.
        
        Returns:
            bool: True si puede editarse, False en caso contrario
        """
        return self.estado_transaccion == ESTADO_TRANSACCION_PENDIENTE
    
    def puede_aprobar(self, usuario):
        """
        Verifica si un usuario puede aprobar esta transacción.
        
        Args:
            usuario: Usuario que intenta aprobar
            
        Returns:
            bool: True si puede aprobar, False en caso contrario
        """
        # No se puede aprobar si ya está aprobada o rechazada
        if self.estado_transaccion != ESTADO_TRANSACCION_PENDIENTE:
            return False
        
        # El creador no puede aprobar (segregación de funciones)
        if self.usuario == usuario:
            return False
        
        return True

### --- Evidencia y trazabilidad ---

class Evidencia(models.Model):
    """
    Modelo para almacenar evidencias documentales (facturas, boletas, fotos, etc.).
    
    Soporta versionado y eliminación lógica para auditoría.
    """
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, db_index=True)
    archivo_evidencia = models.FileField(upload_to='evidencias/')
    tipo_archivo = models.CharField(max_length=50, help_text="Tipo MIME del archivo")
    fecha_carga = models.DateTimeField(auto_now_add=True, db_index=True)
    nombre_evidencia = models.CharField(max_length=255)
    
    # Campos para versionado y eliminación lógica
    version = models.IntegerField(default=1, help_text="Número de versión del documento")
    evidencia_anterior = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='versiones_siguientes',
        help_text="Referencia a la versión anterior si existe"
    )
    eliminado = models.BooleanField(default=False, db_index=True, help_text="Eliminación lógica")
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)
    usuario_eliminacion = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidencias_eliminadas',
        help_text="Usuario que eliminó la evidencia"
    )
    
    # Usuario que cargó la evidencia (trazabilidad C005)
    usuario_carga = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidencias_cargadas',
        help_text="Usuario que cargó la evidencia"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['proyecto', 'eliminado']),
            models.Index(fields=['fecha_carga']),
        ]
        ordering = ['-fecha_carga']
    
    def __str__(self):
        return f"{self.nombre_evidencia} (v{self.version})"
    
    def soft_delete(self, usuario):
        """
        Realiza una eliminación lógica de la evidencia.
        
        Args:
            usuario: Usuario que realiza la eliminación
        """
        from django.utils import timezone
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.usuario_eliminacion = usuario
        self.save()

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
    """
    Modelo para ítems presupuestarios de un proyecto.
    
    Cada ítem tiene un monto asignado y un monto ejecutado que se actualiza
    cuando se aprueban transacciones asociadas.
    """
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, db_index=True)
    nombre_item_presupuesto = models.CharField(max_length=100)
    monto_asignado_item = models.DecimalField(max_digits=12, decimal_places=2)
    monto_ejecutado_item = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Categoría del ítem para validación (C006)
    categoria_item = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Categoría del ítem para validar contra la categoría del gasto"
    )

    class Meta:
        indexes = [
            models.Index(fields=['proyecto']),
        ]
        ordering = ['nombre_item_presupuesto']

    def __str__(self):
        return f"{self.proyecto.nombre_proyecto} - {self.nombre_item_presupuesto}"
    
    @property
    def saldo_disponible(self):
        """
        Calcula el saldo disponible del ítem presupuestario.
        
        Returns:
            Decimal: Saldo disponible (monto_asignado - monto_ejecutado)
        """
        from decimal import Decimal
        return self.monto_asignado_item - self.monto_ejecutado_item
    
    def tiene_saldo_suficiente(self, monto):
        """
        Verifica si el ítem tiene saldo suficiente para una transacción.
        
        Args:
            monto: Monto de la transacción a verificar
            
        Returns:
            bool: True si hay saldo suficiente, False en caso contrario
        """
        return self.saldo_disponible >= monto
    
    def porcentaje_ejecutado(self):
        """
        Calcula el porcentaje del presupuesto ejecutado.
        
        Returns:
            float: Porcentaje ejecutado (0-100)
        """
        if self.monto_asignado_item == 0:
            return 0.0
        return float((self.monto_ejecutado_item / self.monto_asignado_item) * 100)
    
class Subitem_Presupuestario(models.Model):
    """
    Modelo para subítems presupuestarios dentro de un ítem.
    
    Permite una estructura jerárquica de presupuesto más detallada.
    """
    item_presupuesto = models.ForeignKey(Item_Presupuestario, on_delete=models.CASCADE, db_index=True)
    nombre_subitem_presupuesto = models.CharField(max_length=100)
    monto_asignado_subitem = models.DecimalField(max_digits=12, decimal_places=2)
    monto_ejecutado_subitem = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    class Meta:
        indexes = [
            models.Index(fields=['item_presupuesto']),
        ]
        ordering = ['nombre_subitem_presupuesto']

    def __str__(self):
        return f"{self.item_presupuesto.nombre_item_presupuesto} - {self.nombre_subitem_presupuesto}"
    
    @property
    def saldo_disponible(self):
        """
        Calcula el saldo disponible del subítem presupuestario.
        
        Returns:
            Decimal: Saldo disponible (monto_asignado - monto_ejecutado)
        """
        from decimal import Decimal
        return self.monto_asignado_subitem - self.monto_ejecutado_subitem
    
    def tiene_saldo_suficiente(self, monto):
        """
        Verifica si el subítem tiene saldo suficiente para una transacción.
        
        Args:
            monto: Monto de la transacción a verificar
            
        Returns:
            bool: True si hay saldo suficiente, False en caso contrario
        """
        return self.saldo_disponible >= monto
    
    def porcentaje_ejecutado(self):
        """
        Calcula el porcentaje del presupuesto ejecutado.
        
        Returns:
            float: Porcentaje ejecutado (0-100)
        """
        if self.monto_asignado_subitem == 0:
            return 0.0
        return float((self.monto_ejecutado_subitem / self.monto_asignado_subitem) * 100)
