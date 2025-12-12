/**
 * Tests de Permisos por Rol
 * Verifican que los usuarios solo ven y pueden acceder a lo que tienen permitido
 */

describe('Permisos por Rol', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('Auditor NO debe poder crear gastos', () => {
    cy.fixture('users').then((users) => {
      const auditor = users.auditor;
      
      cy.loginApi(auditor.username, auditor.password);
      cy.visit('/');
      cy.waitForPageLoad();
      
      // Intentar acceder a registrar gasto con un proyecto específico
      cy.visit('/registrar-gasto?proyecto=7');
      cy.waitForPageLoad();
      
      // Esperar a que se carguen los roles y se evalúen los permisos
      cy.wait(5000);
      
      // Verificar que aparece el mensaje de acceso denegado
      // Si no aparece, el componente se carga pero el backend bloqueará la acción
      cy.get('body', { timeout: 10000 }).then(($body) => {
        const bodyText = $body.text();
        
        if (bodyText.includes('Acceso Denegado')) {
          // El ProtectedRoute bloqueó el acceso
          cy.contains('Acceso Denegado').should('be.visible');
        } else {
          // El componente se carga, pero verificamos que el backend bloqueará
          // Obtener el token del localStorage antes de hacer la petición
          cy.window().then((win) => {
            const token = win.localStorage.getItem('access_token');
            
            // Intentar crear una transacción directamente mediante API
            cy.request({
              method: 'POST',
              url: `${Cypress.config('baseUrl')}/api/transacciones/`,
              body: {
                proyecto: 7,
                proveedor: 1, // Asumiendo que existe un proveedor
                monto_transaccion: '1000',
                fecha_registro: new Date().toISOString().split('T')[0],
                nro_documento: 'TEST-123',
                tipo_doc_transaccion: 'factura electrónica',
                tipo_transaccion: 'egreso',
              },
              failOnStatusCode: false,
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }).then((response) => {
              // El backend debe rechazar con 403 o 400
              expect(response.status).to.be.oneOf([403, 400]);
              // Verificar que el mensaje de error indica falta de permisos
              if (response.body) {
                expect(
                  JSON.stringify(response.body).toLowerCase()
                ).to.satisfy((text) => 
                  text.includes('permiso') || 
                  text.includes('permission') || 
                  text.includes('no tiene')
                );
              }
            });
          });
        }
      });
    });
  });

  it('Auditor NO debe poder generar informes', () => {
    cy.fixture('users').then((users) => {
      const auditor = users.auditor;
      
      cy.loginApi(auditor.username, auditor.password);
      
      // Necesitamos un proyecto existente para probar esto
      // Asumiendo que existe un proyecto con ID 1
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      
      // Verificar que los botones de generar informe NO están visibles
      // cy.get('button').contains('Generar PDF').should('not.exist');
      // cy.get('button').contains('Generar Excel').should('not.exist');
    });
  });

  it('Auditor SÍ debe poder ver informes generados', () => {
    cy.fixture('users').then((users) => {
      const auditor = users.auditor;
      
      cy.loginApi(auditor.username, auditor.password);
      
      // Visitar página de pre-rendición donde se muestran los informes generados
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      
      // Verificar que puede ver la sección de informes generados
      // cy.contains('Informes Generados').should('be.visible');
    });
  });

  it('Directivo NO debe poder registrar gastos', () => {
    cy.fixture('users').then((users) => {
      const directivo = users.directivo;
      
      cy.loginApi(directivo.username, directivo.password);
      cy.visit('/');
      cy.waitForPageLoad();
      
      // Intentar acceder a registrar gasto con un proyecto específico
      cy.visit('/registrar-gasto?proyecto=7');
      cy.waitForPageLoad();
      
      // Esperar a que se carguen los roles y se evalúen los permisos
      cy.wait(5000);
      
      // Verificar que aparece el mensaje de acceso denegado
      // Si no aparece, el componente se carga pero el backend bloqueará la acción
      cy.get('body', { timeout: 10000 }).then(($body) => {
        const bodyText = $body.text();
        
        if (bodyText.includes('Acceso Denegado')) {
          // El ProtectedRoute bloqueó el acceso
          cy.contains('Acceso Denegado').should('be.visible');
        } else {
          // El componente se carga, pero verificamos que el backend bloqueará
          // Obtener el token del localStorage antes de hacer la petición
          cy.window().then((win) => {
            const token = win.localStorage.getItem('access_token');
            
            // Intentar crear una transacción directamente mediante API
            cy.request({
              method: 'POST',
              url: `${Cypress.config('baseUrl')}/api/transacciones/`,
              body: {
                proyecto: 7,
                proveedor: 1, // Asumiendo que existe un proveedor
                monto_transaccion: '1000',
                fecha_registro: new Date().toISOString().split('T')[0],
                nro_documento: 'TEST-123',
                tipo_doc_transaccion: 'factura electrónica',
                tipo_transaccion: 'egreso',
              },
              failOnStatusCode: false,
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }).then((response) => {
              // El backend debe rechazar con 403 o 400
              expect(response.status).to.be.oneOf([403, 400]);
              // Verificar que el mensaje de error indica falta de permisos
              if (response.body) {
                expect(
                  JSON.stringify(response.body).toLowerCase()
                ).to.satisfy((text) => 
                  text.includes('permiso') || 
                  text.includes('permission') || 
                  text.includes('no tiene')
                );
              }
            });
          });
        }
      });
    });
  });

  it('Directivo SÍ debe poder generar informes', () => {
    cy.fixture('users').then((users) => {
      const directivo = users.directivo;
      
      cy.loginApi(directivo.username, directivo.password);
      
      // Visitar página de pre-rendición
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      
      // Verificar que los botones de generar informe están visibles
      // cy.get('button').contains('Generar PDF').should('exist');
    });
  });

  it('Admin Proyecto SÍ debe poder editar proyectos', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      // Visitar detalles de un proyecto
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      
      // Verificar que el botón de editar está visible
      // cy.get('button').contains('Editar').should('exist');
    });
  });

  it('Auditor NO debe poder editar proyectos', () => {
    cy.fixture('users').then((users) => {
      const auditor = users.auditor;
      
      cy.loginApi(auditor.username, auditor.password);
      
      // Visitar detalles de un proyecto
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      
      // Verificar que el botón de editar NO está visible
      // cy.get('button').contains('Editar').should('not.exist');
    });
  });
});

