/**
 * Tests de Smoke - Verificaciones básicas de que la aplicación funciona
 * Estos tests verifican que las páginas principales cargan correctamente
 */

describe('Smoke Tests - Verificación básica de la aplicación', () => {
  beforeEach(() => {
    // Limpiar estado antes de cada prueba
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('Debe cargar la página de login', () => {
    cy.visit('/login');
    cy.get('body').should('be.visible');
    // Esperar a que el formulario se renderice
    cy.get('form', { timeout: 10000 }).should('exist');
    // Verificar que existe el formulario de login usando IDs
    cy.get('#username').should('exist').and('be.visible');
    cy.get('#password').should('exist').and('be.visible');
    cy.get('button[type="submit"]').should('exist').and('be.visible');
  });

  it('Debe mostrar mensaje de error con credenciales inválidas', () => {
    cy.visit('/login');
    // Esperar a que el formulario se renderice
    cy.get('#username', { timeout: 10000 }).should('be.visible');
    cy.get('#username').type('usuario_inexistente');
    cy.get('#password').type('password_incorrecto');
    cy.get('button[type="submit"]').click();
    
    // Esperar un momento para que el error se procese
    cy.wait(1000);
    
    // Verificar que aparece un toast de error (opcional, puede desaparecer rápido)
    cy.waitForToast(null, 'error', true);
    
    // Verificar que no se redirige al dashboard (más confiable)
    cy.url().should('include', '/login');
    
    // Verificar que NO se guardó el token
    cy.window().then((win) => {
      expect(win.localStorage.getItem('access_token')).to.be.null;
    });
  });

  it('Debe redirigir al login cuando se accede a una ruta protegida sin autenticación', () => {
    cy.visit('/');
    // Debe redirigir al login si no hay token
    cy.url().should('include', '/login');
  });

  it('Debe tener elementos básicos del layout en la página de login', () => {
    cy.visit('/login');
    cy.get('body').should('be.visible');
    // Verificar que la página tiene estructura básica
    cy.get('form').should('exist');
  });
});

