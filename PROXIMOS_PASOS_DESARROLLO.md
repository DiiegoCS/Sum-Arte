# Próximos Pasos para el Desarrollo de Sum-Arte

## Estado Actual ✅

### Completado:
- ✅ Autenticación JWT (backend y frontend)
- ✅ Sistema de permisos basado en roles
- ✅ Dashboard con métricas y gráficos
- ✅ Formulario de registro de gastos funcional
- ✅ Creación de proveedores desde el formulario
- ✅ Carga de evidencias (archivos)
- ✅ Validaciones de negocio (C001-C011) en backend
- ✅ Servicios de negocio (TransactionService, BudgetService)
- ✅ Manejo de errores mejorado

### Problemas Resueltos:
- ✅ Error `n.map is not a function` en Dashboard
- ✅ Error `n.map is not a function` en formulario de gastos
- ✅ Error 400 al crear transacciones (proveedor no creado)

---

## Próximos Pasos Prioritarios

### 1. **Completar Funcionalidad de Evidencias** 🔴 Alta Prioridad

**Problema actual:** Las evidencias se suben pero puede haber problemas en la vinculación.

**Tareas:**
- [ ] Verificar que `uploadEvidence` y `linkEvidenceToTransaction` funcionen correctamente
- [ ] Implementar visualización de evidencias en el detalle de transacciones
- [ ] Agregar soporte para versionado de evidencias (soft delete)
- [ ] Validar tipos de archivo y tamaño máximo (C010)

**Archivos a modificar:**
- `Front/src/services/evidenceService.js` - Verificar implementación
- `Front/src/pages/ProjectDetails.jsx` - Agregar visualizador de evidencias
- `Back/api/views.py` - EvidenciaViewSet (soft delete, validaciones)

---

### 2. **Mejorar Página de Detalles de Proyecto** 🟡 Media Prioridad

**Estado actual:** La página existe pero necesita mejoras.

**Tareas:**
- [ ] Mostrar lista de transacciones del proyecto
- [ ] Agregar UI para aprobar/rechazar transacciones
- [ ] Mostrar ítems presupuestarios con barras de progreso
- [ ] Visualizador de evidencias por transacción
- [ ] Filtros y búsqueda de transacciones

**Archivos a modificar:**
- `Front/src/pages/ProjectDetails.jsx` - Completar implementación
- `Front/src/components/TransactionCard.jsx` - Crear componente nuevo
- `Front/src/components/BudgetItemCard.jsx` - Crear componente nuevo

---

### 3. **Implementar Páginas de Rendición** 🟡 Media Prioridad

**Estado actual:** No implementado.

**Tareas:**
- [ ] Crear `PreRendicion.jsx` - Vista de pre-rendición con validaciones
  - Mostrar checklist de integridad (C008)
  - Listar transacciones pendientes de aprobación
  - Mostrar advertencias y errores
- [ ] Crear `CerrarRendicion.jsx` - Vista para cerrar rendición
  - Generar documento oficial (PDF)
  - Bloquear edición de transacciones (C005, C011)
  - Confirmación final

**Archivos a crear:**
- `Front/src/pages/PreRendicion.jsx`
- `Front/src/pages/CerrarRendicion.jsx`
- `Back/api/reports.py` - Generación de PDFs (reportlab)

**Archivos a modificar:**
- `Front/src/App.jsx` - Agregar rutas
- `Back/api/views.py` - Agregar acciones `pre_rendicion` y `cerrar_rendicion`

---

### 4. **Sistema de Logging y Auditoría** 🟢 Baja Prioridad

**Estado actual:** Modelo `Log_transaccion` existe pero no se usa automáticamente.

**Tareas:**
- [ ] Crear `Back/api/signals.py` - Señales de Django para logging automático
  - Log cuando se crea una transacción
  - Log cuando se aprueba/rechaza
  - Log cuando se modifica
- [ ] Configurar logging en `Back/core/settings.py`
- [ ] Crear endpoint para consultar logs de auditoría
- [ ] Mostrar historial de cambios en frontend

**Archivos a crear:**
- `Back/api/signals.py`

**Archivos a modificar:**
- `Back/core/settings.py` - Configurar logging
- `Back/api/views.py` - Agregar LogTransaccionViewSet con filtros
- `Front/src/pages/TransactionDetails.jsx` - Mostrar historial (crear si no existe)

---

### 5. **Generación de Reportes** 🟢 Baja Prioridad

**Estado actual:** `reportlab` está en requirements.txt pero no se usa.

**Tareas:**
- [ ] Crear `Back/api/reports.py` con funciones de generación:
  - PDF de rendición oficial
  - PDF de resumen de proyecto
  - Exportar a Excel (openpyxl)
- [ ] Agregar endpoints para descargar reportes
- [ ] Agregar botones de descarga en frontend

**Archivos a crear:**
- `Back/api/reports.py`

**Archivos a modificar:**
- `Back/api/views.py` - Agregar acciones para generar reportes
- `Front/src/pages/ProjectDetails.jsx` - Botones de descarga
- `Front/src/pages/CerrarRendicion.jsx` - Botón de descarga de rendición

---

### 6. **Mejoras en Manejo de Proveedores** 🟡 Media Prioridad

**Estado actual:** Se pueden crear desde el formulario, pero falta gestión completa.

**Tareas:**
- [ ] Cargar lista de proveedores existentes en el formulario
- [ ] Crear página de gestión de proveedores
- [ ] Agregar búsqueda y filtros de proveedores
- [ ] Validar RUT único (ya está en backend)

**Archivos a modificar:**
- `Front/src/pages/RegisterExpense.jsx` - Cargar proveedores existentes
- `Front/src/pages/Providers.jsx` - Crear página nueva
- `Front/src/services/providerService.js` - Ya existe, verificar funcionalidad

---

### 7. **Documentación del Código** 🟢 Baja Prioridad

**Estado actual:** Algunos archivos tienen docstrings, otros no.

**Tareas:**
- [ ] Agregar docstrings estilo Google a todas las funciones/clases
- [ ] Documentar módulos principales
- [ ] Agregar comentarios inline para lógica compleja
- [ ] Crear documentación de API (considerar drf-spectacular)

**Archivos prioritarios:**
- `Back/api/services.py` - Completar docstrings
- `Back/api/validators.py` - Completar docstrings
- `Back/api/views.py` - Completar docstrings
- `Front/src/services/*.js` - Completar JSDoc

---

### 8. **Suite de Pruebas** 🟡 Media Prioridad

**Estado actual:** No hay tests implementados.

**Tareas:**
- [ ] Crear tests unitarios para modelos
- [ ] Crear tests unitarios para serializers
- [ ] Crear tests unitarios para validadores (C001-C011)
- [ ] Crear tests de integración para flujos completos:
  - Crear transacción → Aprobar → Verificar presupuesto
  - Crear transacción → Rechazar
  - Pre-rendición → Cerrar rendición
- [ ] Tests de frontend (opcional, con Jest/React Testing Library)

**Archivos a crear:**
- `Back/api/tests/__init__.py`
- `Back/api/tests/test_models.py`
- `Back/api/tests/test_serializers.py`
- `Back/api/tests/test_validators.py`
- `Back/api/tests/test_views.py`
- `Back/api/tests/test_services.py`
- `Back/api/tests/test_integration.py`

---

## Orden Recomendado de Implementación

### Fase 1 (1-2 semanas): Funcionalidad Core
1. ✅ Completar formulario de gastos (YA HECHO)
2. 🔴 Mejorar página de detalles de proyecto
3. 🔴 Completar funcionalidad de evidencias

### Fase 2 (1-2 semanas): Flujos de Negocio
4. 🟡 Implementar páginas de rendición
5. 🟡 Mejorar gestión de proveedores

### Fase 3 (1 semana): Calidad y Documentación
6. 🟢 Sistema de logging y auditoría
7. 🟢 Generación de reportes
8. 🟢 Documentación del código

### Fase 4 (1-2 semanas): Testing
9. 🟡 Suite de pruebas completa

---

## Notas Importantes

### Errores Conocidos a Verificar:
- [ ] Verificar que las evidencias se vinculen correctamente a las transacciones
- [ ] Verificar que el saldo disponible se actualice correctamente al aprobar
- [ ] Verificar que las validaciones C001-C011 funcionen en todos los casos

### Mejoras Futuras (Post-MVP):
- [ ] Notificaciones por email cuando se aprueba/rechaza una transacción
- [ ] Dashboard con filtros por fecha
- [ ] Exportación masiva de reportes
- [ ] Integración con sistemas bancarios (para conciliación automática)
- [ ] App móvil (opcional)

---

## Comandos Útiles

### Backend:
```bash
# Crear migraciones
cd Back
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Ejecutar servidor de desarrollo
python manage.py runserver

# Ejecutar tests
python manage.py test
```

### Frontend:
```bash
# Instalar dependencias
cd Front
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

### Docker:
```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en background
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar servicios
docker-compose restart backend
docker-compose restart frontend
```

---

## Recursos y Referencias

- [Django REST Framework Documentation](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [DRF Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Recharts Documentation](https://recharts.org/)
- [ReportLab User Guide](https://www.reportlab.com/docs/reportlab-userguide.pdf)

---

**Última actualización:** 2025-11-24
**Estado del proyecto:** En desarrollo activo - Fase 1 completada



