# Guía de Pruebas E2E con Cypress

Este directorio contiene las pruebas end-to-end (E2E) de la aplicación Sum-Arte usando Cypress.

## Estructura de Carpetas

```
cypress/
├── e2e/              # Tests E2E organizados por funcionalidad
│   ├── 01-smoke.cy.js                # Tests básicos de smoke
│   ├── 02-authentication.cy.js       # Tests de autenticación
│   ├── 03-dashboard.cy.js            # Tests del dashboard
│   ├── 04-permissions.cy.js          # Tests de permisos por rol
│   ├── 05-projects.cy.js             # Tests de gestión de proyectos
│   ├── 06-transactions.cy.js         # Tests de registro de transacciones
│   ├── 07-transaction-approval.cy.js # Tests de aprobación/rechazo
│   └── 08-reports.cy.js              # Tests de generación de informes
├── fixtures/         # Datos de prueba (JSON)
│   ├── users.json    # Usuarios de prueba
│   └── projects.json # Proyectos de prueba
├── support/          # Archivos de soporte
│   ├── commands.js   # Comandos personalizados de Cypress
│   └── e2e.js        # Configuración global y hooks
└── reports/          # Reportes generados (gitignored)
```

## Comandos Disponibles

### Ejecutar Cypress en modo interactivo
```bash
npm run cypress:open
```
Abre la interfaz gráfica de Cypress donde puedes seleccionar y ejecutar tests individuales.

### Ejecutar todos los tests en modo headless
```bash
npm run cypress:run
```
Ejecuta todos los tests en modo headless (sin interfaz gráfica).

### Ejecutar tests en un navegador específico
```bash
npm run cypress:run:chrome    # Chrome
npm run cypress:run:firefox    # Firefox
npm run cypress:run:edge       # Edge
```

### Generar reporte completo
```bash
npm run cypress:report
```
Ejecuta todos los tests y genera un reporte HTML consolidado en `cypress/reports/`.

## Configuración

### Variables de Entorno

El archivo `cypress.config.js` está configurado para usar:
- **baseUrl**: `http://localhost:5173` (puerto por defecto de Vite)

Si tu aplicación corre en otro puerto, actualiza `baseUrl` en `cypress.config.js`.

### Usuarios de Prueba

Los usuarios de prueba están definidos en `cypress/fixtures/users.json`. Asegúrate de que estos usuarios existan en tu base de datos de desarrollo/pruebas:

- **admin**: Administrador de proyecto
- **ejecutor**: Ejecutor
- **auditor**: Auditor (solo lectura)
- **directivo**: Directivo
- **superuser**: Superusuario

## Comandos Personalizados

Cypress incluye varios comandos personalizados para facilitar las pruebas:

### `cy.loginApi(username, password)`
Hace login mediante API y guarda el token en localStorage.

```javascript
cy.loginApi('admin', 'password123');
```

### `cy.loginUI(username, password)`
Hace login mediante la interfaz de usuario.

```javascript
cy.loginUI('admin', 'password123');
```

### `cy.logout()`
Hace logout limpiando localStorage y cookies.

```javascript
cy.logout();
```

### `cy.waitForPageLoad()`
Espera a que la página cargue completamente.

```javascript
cy.waitForPageLoad();
```

### `cy.waitForToast(message, type)`
Espera a que aparezca un toast/notificación.

```javascript
cy.waitForToast('Operación exitosa', 'success');
```

### `cy.navigateTo(path)`
Navega a una ruta y espera a que cargue.

```javascript
cy.navigateTo('/proyecto/1');
```

## Tests Disponibles

### 01-smoke.cy.js
Tests básicos de smoke que verifican que la aplicación carga correctamente:
- Carga de página de login
- Manejo de credenciales inválidas
- Protección de rutas sin autenticación

### 02-authentication.cy.js
Tests del flujo completo de autenticación:
- Login exitoso con credenciales válidas
- Login mediante API
- Logout
- Protección de rutas

### 03-dashboard.cy.js
Tests del dashboard ejecutivo:
- Carga del dashboard después del login
- Visualización de proyectos
- Navegación a detalles de proyecto

### 04-permissions.cy.js
Tests de permisos por rol:
- Auditor NO puede crear gastos ni generar informes
- Auditor SÍ puede ver informes generados
- Directivo NO puede registrar gastos
- Directivo SÍ puede generar informes
- Admin Proyecto puede editar proyectos

### 05-projects.cy.js
Tests de gestión de proyectos:
- Creación de proyectos (Admin y Directivo)
- Edición de proyectos (Admin y Directivo)
- Visualización de proyectos
- Restricciones de acceso según rol

### 06-transactions.cy.js
Tests de registro de transacciones:
- Acceso a página de registrar gasto (Ejecutor y Admin)
- Selección de proyecto y proveedor
- Campos requeridos del formulario
- Visualización de transacciones

### 07-transaction-approval.cy.js
Tests de aprobación/rechazo de transacciones:
- Visualización de transacciones pendientes
- Aprobación de transacciones (Admin Proyecto)
- Rechazo de transacciones (Admin Proyecto)
- Segregación de funciones (creador no puede aprobar)
- Visualización de estados de transacciones

### 08-reports.cy.js
Tests de generación y visualización de informes:
- Generación de informes PDF/Excel (Admin y Directivo)
- Restricción de generación para Auditores
- Visualización de informes generados
- Descarga de informes
- Informe oficial de rendición

## Escribir Nuevos Tests

### Estructura Básica

```javascript
describe('Mi Funcionalidad', () => {
  beforeEach(() => {
    // Setup antes de cada test
    cy.clearLocalStorage();
    cy.fixture('users').then((users) => {
      cy.loginApi(users.admin.username, users.admin.password);
    });
  });

  it('debe hacer algo específico', () => {
    cy.visit('/ruta');
    // Tus assertions aquí
    cy.get('.elemento').should('be.visible');
  });
});
```

### Mejores Prácticas

1. **Usar fixtures para datos**: Carga datos desde `cypress/fixtures/` en lugar de hardcodearlos.

2. **Limpiar estado**: Usa `beforeEach` para limpiar localStorage y cookies antes de cada test.

3. **Login mediante API**: Para tests que requieren autenticación, usa `cy.loginApi()` en lugar de `cy.loginUI()` para mayor velocidad.

4. **Selectores estables**: Usa `data-testid` en tus componentes React para selectores más estables.

5. **Esperas explícitas**: Usa `cy.wait()` solo cuando sea absolutamente necesario. Prefiere `cy.should()` con timeouts.

## Reportes

Los reportes se generan automáticamente después de ejecutar los tests. Los encontrarás en:

- **JSON individuales**: `cypress/reports/*.json`
- **Reporte consolidado HTML**: `cypress/reports/mochawesome.html`

Abre `cypress/reports/mochawesome.html` en tu navegador para ver el reporte completo con:
- Resumen de tests ejecutados
- Tests pasados/fallidos
- Screenshots de fallos
- Tiempos de ejecución

## Troubleshooting

### Los tests fallan porque no encuentra elementos

1. Verifica que la aplicación esté corriendo en el puerto configurado (`http://localhost:5173`).
2. Asegúrate de que los usuarios de prueba existan en la base de datos.
3. Verifica que los selectores CSS sean correctos (puedes usar el selector de Cypress en modo interactivo).

### Los tests son lentos

1. Usa `cy.loginApi()` en lugar de `cy.loginUI()`.
2. Evita `cy.wait()` innecesarios.
3. Ejecuta tests en paralelo usando `--parallel` (requiere Cypress Dashboard).

### Los reportes no se generan

1. Verifica que `mochawesome-merge` y `mochawesome-report-generator` estén instalados.
2. Ejecuta `npm run cypress:merge-reports` manualmente después de los tests.

## Integración con CI/CD

Para ejecutar Cypress en CI/CD, agrega estos pasos:

```yaml
# Ejemplo para GitHub Actions
- name: Run Cypress tests
  run: |
    npm ci
    npm run dev &
    npm run cypress:run
    npm run cypress:merge-reports

- name: Upload test reports
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: cypress-reports
    path: cypress/reports/
```

## Recursos Adicionales

- [Documentación oficial de Cypress](https://docs.cypress.io/)
- [Best Practices de Cypress](https://docs.cypress.io/guides/references/best-practices)
- [Comandos personalizados](https://docs.cypress.io/api/cypress-api/custom-commands)

