// ***********************************************************
// Comandos personalizados de Cypress
// ***********************************************************

/**
 * Comando para hacer login mediante API y guardar el token en localStorage
 * 
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @param {string} baseUrl - URL base de la API (opcional)
 *                         - Si no se especifica, usa la baseUrl del frontend + /api
 *                         - Si el backend está en otro puerto, usar: 'http://localhost:8000/api'
 * 
 * @example
 * cy.loginApi('admin', 'password123')
 * cy.loginApi('usuario', 'pass', 'http://localhost:8000/api')
 */
Cypress.Commands.add('loginApi', (username, password, baseUrl = null) => {
  // Por defecto, usar la URL del frontend + /api (asumiendo que hay un proxy)
  // Si el backend está en otro puerto (ej: 8000), especificarlo: 'http://localhost:8000/api'
  const apiUrl = baseUrl || `${Cypress.config('baseUrl')}/api`;
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/token/`,
    body: {
      username: username,
      password: password,
    },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body.access) {
      // Guardar tokens en localStorage
      window.localStorage.setItem('access_token', response.body.access);
      if (response.body.refresh) {
        window.localStorage.setItem('refresh_token', response.body.refresh);
      }
      
      // Decodificar el token para obtener información del usuario
      try {
        const tokenPayload = JSON.parse(atob(response.body.access.split('.')[1]));
        
        // Guardar información del usuario en localStorage
        const userData = {
          id: tokenPayload.user_id,
          username: tokenPayload.username,
          email: tokenPayload.email,
          organizacion_id: tokenPayload.organizacion_id,
          is_superuser: tokenPayload.is_superuser,
          usuario_principal: tokenPayload.usuario_principal || false,
        };
        window.localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {
        cy.log('Error al decodificar token:', e);
      }
      
      return cy.wrap(response);
    } else {
      const errorMsg = response.body?.detail || response.body?.error || `Status ${response.status}`;
      throw new Error(`Login fallido: ${errorMsg}`);
    }
  });
});

/**
 * Comando para hacer login mediante la interfaz de usuario
 * 
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * 
 * @example
 * cy.loginUI('admin', 'password123')
 */
Cypress.Commands.add('loginUI', (username, password) => {
  cy.visit('/login');
  // Esperar a que el formulario se renderice
  cy.get('#username', { timeout: 10000 }).should('be.visible');
  cy.get('#username').type(username);
  cy.get('#password').type(password);
  cy.get('button[type="submit"]').click();
  
  // Esperar a que la redirección ocurra (más confiable que el toast)
  cy.url({ timeout: 10000 }).should('not.include', '/login');
  
  // Opcionalmente verificar el toast (puede desaparecer rápido)
  cy.waitForToast('Inicio de sesión exitoso', 'success', true);
});

/**
 * Comando para hacer logout
 * 
 * @example
 * cy.logout()
 */
Cypress.Commands.add('logout', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.visit('/login');
});

/**
 * Comando para esperar a que la página cargue completamente
 * Útil después de navegaciones o acciones que recargan la página
 * 
 * @example
 * cy.waitForPageLoad()
 */
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible');
  cy.window().its('document.readyState').should('eq', 'complete');
});

/**
 * Comando para verificar que un elemento está visible y hacer scroll hasta él
 * 
 * @param {string} selector - Selector del elemento
 * 
 * @example
 * cy.scrollToElement('.card-title')
 */
Cypress.Commands.add('scrollToElement', (selector) => {
  cy.get(selector).should('be.visible').scrollIntoView();
});

/**
 * Comando para esperar a que un toast/notificación aparezca y verificar su mensaje
 * 
 * @param {string} message - Mensaje esperado en el toast (opcional)
 * @param {string} type - Tipo de toast ('success', 'error', 'info', 'warning')
 * @param {boolean} optional - Si es true, no falla si el toast no aparece (útil para toasts que desaparecen rápido)
 * 
 * @example
 * cy.waitForToast('Operación exitosa', 'success')
 * cy.waitForToast(null, 'success', true) // Solo verifica que existe, no falla si no aparece
 */
Cypress.Commands.add('waitForToast', (message, type = 'success', optional = false) => {
  // React Toastify muestra los toasts con clases específicas
  const toastClass = type === 'success' ? '.Toastify__toast--success' : 
                     type === 'error' ? '.Toastify__toast--error' :
                     type === 'info' ? '.Toastify__toast--info' :
                     '.Toastify__toast--warning';
  
  // Si es opcional, solo intenta encontrar el toast pero no falla si no aparece
  if (optional) {
    cy.get('body').then(($body) => {
      if ($body.find(toastClass).length > 0) {
        cy.get(toastClass, { timeout: 5000 }).should('be.visible');
        if (message) {
          cy.contains(message).should('be.visible');
        }
      }
    });
  } else {
    cy.get(toastClass, { timeout: 10000 }).should('be.visible');
    if (message) {
      cy.contains(message).should('be.visible');
    }
  }
});

/**
 * Comando para verificar que el usuario tiene un rol específico
 * Útil para pruebas que requieren permisos específicos
 * 
 * @param {string} role - Nombre del rol ('admin proyecto', 'ejecutor', 'auditor', 'directivo')
 * 
 * @example
 * cy.hasRole('admin proyecto')
 */
Cypress.Commands.add('hasRole', (role) => {
  cy.window().then((win) => {
    const user = JSON.parse(win.localStorage.getItem('user') || '{}');
    // Esta verificación requiere que el usuario tenga roles cargados
    // Puede necesitar ajustes según cómo se almacenen los roles en tu aplicación
    return cy.wrap(user);
  });
});

/**
 * Comando para navegar a una página específica y esperar a que cargue
 * 
 * @param {string} path - Ruta a la que navegar
 * 
 * @example
 * cy.navigateTo('/proyecto/1')
 */
Cypress.Commands.add('navigateTo', (path) => {
  cy.visit(path);
  cy.waitForPageLoad();
});

