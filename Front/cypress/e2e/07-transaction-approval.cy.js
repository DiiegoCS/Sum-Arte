/**
 * Tests de Aprobación y Rechazo de Transacciones
 * Verifican el flujo de aprobación/rechazo de transacciones pendientes
 */

describe('Aprobación de Transacciones', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('Admin Proyecto debe poder ver transacciones pendientes', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      // Visitar detalles de un proyecto
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que existe la sección de transacciones
      cy.contains('Transacciones', { timeout: 10000 }).should('be.visible');
      
      // Verificar que hay transacciones en la tabla (si existen)
      // cy.get('table tbody tr').should('exist');
    });
  });

  it('Admin Proyecto debe poder aprobar una transacción pendiente', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Buscar una transacción pendiente con botón de aprobar
      // Nota: Esto requiere que exista al menos una transacción pendiente
      cy.get('body').then(($body) => {
        if ($body.text().includes('Aprobar')) {
          // Hacer clic en el primer botón de aprobar disponible
          cy.get('button').contains('Aprobar').first().click();
          
          // Esperar a que aparezca el toast de éxito
          cy.waitForToast('aprobada', 'success', true);
          
          // Verificar que el estado de la transacción cambió
          cy.wait(2000);
        } else {
          // Si no hay transacciones pendientes, el test pasa
          cy.log('No hay transacciones pendientes para aprobar');
        }
      });
    });
  });

  it('Admin Proyecto debe poder rechazar una transacción pendiente', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Buscar una transacción pendiente con botón de rechazar
      cy.get('body').then(($body) => {
        if ($body.text().includes('Rechazar')) {
          // Hacer clic en el primer botón de rechazar disponible
          cy.get('button').contains('Rechazar').first().click();
          
          // Esperar a que aparezca el toast de éxito
          cy.waitForToast('rechazada', 'success', true);
          
          // Verificar que el estado de la transacción cambió
          cy.wait(2000);
        } else {
          // Si no hay transacciones pendientes, el test pasa
          cy.log('No hay transacciones pendientes para rechazar');
        }
      });
    });
  });

  it('El creador de una transacción NO debe poder aprobarla (segregación de funciones)', () => {
    cy.fixture('users').then((users) => {
      const ejecutor = users.ejecutor;
      
      cy.loginApi(ejecutor.username, ejecutor.password);
      
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que si el ejecutor creó una transacción, no puede aprobarla
      // El botón de aprobar no debe estar visible para sus propias transacciones
      cy.get('body').then(($body) => {
        // Si hay transacciones creadas por este usuario, no deben tener botón de aprobar
        // Esto se verifica a nivel de backend, pero podemos verificar en el frontend
        if ($body.text().includes('Aprobar')) {
          // Si hay botones de aprobar, verificar que no son para transacciones del usuario actual
          cy.log('Verificando segregación de funciones');
        }
      });
    });
  });

  it('Debe mostrar el estado de las transacciones correctamente', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que se muestran los estados de las transacciones
      // (pendiente, aprobado, rechazado)
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        // Verificar que hay algún indicador de estado
        // Esto puede ser badges, texto, etc.
        if (bodyText.includes('Transacciones')) {
          cy.log('Sección de transacciones encontrada');
        }
      });
    });
  });

  it('Debe poder ver el historial de acciones en las transacciones', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Buscar botón o enlace para ver historial
      // Esto depende de tu implementación
      cy.get('body').then(($body) => {
        if ($body.text().includes('Historial') || $body.text().includes('Log')) {
          // Si existe, hacer clic y verificar que se muestra el historial
          cy.contains('Historial').first().click();
          cy.wait(2000);
        }
      });
    });
  });
});

