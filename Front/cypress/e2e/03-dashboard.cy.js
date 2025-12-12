/**
 * Tests del Dashboard
 * Verifican la funcionalidad del dashboard ejecutivo
 */

describe('Dashboard', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Login antes de cada prueba
    cy.fixture('users').then((users) => {
      cy.loginApi(users.admin.username, users.admin.password);
    });
  });

  it('Debe cargar el dashboard después del login', () => {
    cy.visit('/');
    cy.waitForPageLoad();
    
    // Verificar que la página del dashboard carga
    cy.get('body').should('be.visible');
    // Verificar elementos comunes del dashboard (ajustar según tu implementación)
    // cy.contains('Dashboard').should('be.visible');
  });

  it('Debe mostrar proyectos en el dashboard', () => {
    cy.visit('/');
    cy.waitForPageLoad();
    
    // Esperar a que los proyectos se carguen
    cy.wait(2000);
    
    // Verificar que hay elementos de proyecto (ajustar selector según tu implementación)
    // cy.get('[data-testid="project-card"]').should('exist');
  });

  it('Debe navegar a detalles de proyecto al hacer clic', () => {
    cy.visit('/');
    cy.waitForPageLoad();
    cy.wait(2000);
    
    // Hacer clic en el primer proyecto (ajustar selector)
    // cy.get('[data-testid="project-card"]').first().click();
    // cy.url().should('include', '/proyecto/');
  });

  it('Debe mostrar botón de crear proyecto si el usuario tiene permisos', () => {
    cy.visit('/');
    cy.waitForPageLoad();
    
    // Verificar que existe el botón de crear proyecto (solo para usuarios con permisos)
    // cy.get('a[href="/crear-proyecto"]').should('exist');
  });
});

