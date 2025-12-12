/**
 * Tests de Registro y Gestión de Transacciones (Gastos)
 * Verifican que los usuarios con permisos pueden registrar gastos
 */

describe('Registro de Transacciones', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('Ejecutor debe poder acceder a la página de registrar gasto', () => {
    cy.fixture('users').then((users) => {
      const ejecutor = users.ejecutor;
      
      cy.loginApi(ejecutor.username, ejecutor.password);
      cy.visit('/');
      cy.waitForPageLoad();
      
      // Acceder a registrar gasto con un proyecto
      cy.visit('/registrar-gasto?proyecto=7');
      cy.waitForPageLoad();
      
      // Esperar a que se carguen los roles
      cy.wait(3000);
      
      // Verificar que el formulario existe (no debe mostrar acceso denegado)
      cy.get('form', { timeout: 10000 }).should('exist');
      
      // Verificar que no aparece mensaje de acceso denegado
      cy.get('body').then(($body) => {
        expect($body.text()).to.not.include('Acceso Denegado');
      });
    });
  });

  it('Admin Proyecto debe poder acceder a la página de registrar gasto', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      cy.visit('/');
      cy.waitForPageLoad();
      
      // Acceder a registrar gasto con un proyecto
      cy.visit('/registrar-gasto?proyecto=7');
      cy.waitForPageLoad();
      
      // Esperar a que se carguen los roles
      cy.wait(3000);
      
      // Verificar que el formulario existe
      cy.get('form', { timeout: 10000 }).should('exist');
      
      // Verificar campos básicos del formulario
      cy.get("#proyecto").should('exist');
      cy.get("#monto_transaccion").should('exist');
      cy.get("#fecha_registro").should('exist');
    });
  });

  it('Debe poder seleccionar un proyecto en el formulario de registro', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      // Acceder a registrar gasto
      cy.visit('/registrar-gasto?proyecto=7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que el selector de proyecto existe
      cy.get("#proyecto", { timeout: 10000 }).should('exist');
      
      // Verificar que hay opciones disponibles
      cy.get("#proyecto option").should('have.length.greaterThan', 0);
    });
  });

  it('Debe poder seleccionar un proveedor en el formulario', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/registrar-gasto?proyecto=7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que el selector de proveedor existe
      cy.get('select[name="proveedor"]', { timeout: 10000 }).should('exist');
    });
  });

  it('Debe mostrar campos requeridos en el formulario', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/registrar-gasto?proyecto=7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que existen los campos principales
      cy.get("#monto_transaccion").should('exist');
      cy.get("#fecha_registro").should('exist');
      cy.get("#nro_documento").should('exist');
      cy.get("#tipo_doc_transaccion").should('exist');
    });
  });

  it('Debe poder ver la lista de transacciones en los detalles del proyecto', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      // Visitar detalles de un proyecto
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      
      // Esperar a que se carguen las transacciones
      cy.wait(3000);
      
      // Verificar que existe la sección de transacciones
      cy.contains('Transacciones', { timeout: 10000 }).should('be.visible');
      
      // Verificar que existe la tabla o lista de transacciones
      // cy.get('table').should('exist');
    });
  });
});

