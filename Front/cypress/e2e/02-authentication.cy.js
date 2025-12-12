/**
 * Tests de Autenticación
 * Verifican el flujo completo de login y logout
 */

describe('Autenticación', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('Debe hacer login exitosamente con credenciales válidas', () => {
    // Usar fixture para obtener credenciales (ajustar según tus datos de prueba)
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.visit('/login');
      // Esperar a que el formulario se renderice
      cy.get('#username', { timeout: 10000 }).should('be.visible');
      cy.get('#username').type(admin.username);
      cy.get('#password').type(admin.password);
      cy.get('button[type="submit"]').click();
      
      // Esperar a que la redirección ocurra (esto es más confiable que el toast)
      cy.url({ timeout: 10000 }).should('not.include', '/login');
      
      // Opcionalmente verificar el toast (puede desaparecer rápido)
      cy.waitForToast('Inicio de sesión exitoso', 'success', true);
      
      // Verificar que se guardó el token en localStorage
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.exist;
        expect(win.localStorage.getItem('user')).to.exist;
      });
    });
  });

  it('Debe hacer login mediante API y mantener sesión', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      // Login mediante API
      cy.loginApi(admin.username, admin.password);
      
      // Verificar que se guardó el token
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.exist;
      });
      
      // Visitar una página protegida
      cy.visit('/');
      cy.url().should('not.include', '/login');
    });
  });

  it('Debe hacer logout correctamente', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      // Login primero
      cy.loginApi(admin.username, admin.password);
      cy.visit('/');
      
      // Verificar que está autenticado
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.exist;
      });
      
      // Hacer logout (ajustar según tu implementación de logout)
      // Si tienes un botón de logout, hacer clic en él
      // cy.get('[data-testid="logout-button"]').click();
      
      // O usar el comando personalizado
      cy.logout();
      
      // Verificar que se limpió el localStorage
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.be.null;
      });
      
      // Verificar redirección al login
      cy.url().should('include', '/login');
    });
  });

  it('Debe proteger rutas que requieren autenticación', () => {
    // Intentar acceder a dashboard sin autenticación
    cy.visit('/');
    cy.url().should('include', '/login');
    
    // Intentar acceder a crear proyecto sin autenticación
    cy.visit('/crear-proyecto');
    cy.url().should('include', '/login');
  });
});

