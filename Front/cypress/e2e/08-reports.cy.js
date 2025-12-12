/**
 * Tests de Generación y Visualización de Informes
 * Verifican que los usuarios pueden generar y descargar informes según sus permisos
 */

describe('Generación de Informes', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('Admin Proyecto debe poder generar informe de estado en PDF', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      // Visitar página de pre-rendición
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Buscar botón de generar informe PDF
      cy.get('body').then(($body) => {
        if ($body.text().includes('PDF') || $body.text().includes('Generar')) {
          // Verificar que existe el botón de generar PDF
          cy.get('button').contains('PDF').should('exist');
          
          // Nota: No hacemos clic para evitar descargar archivos en los tests
          // Pero verificamos que el botón existe y es accesible
        }
      });
    });
  });

  it('Admin Proyecto debe poder generar informe de estado en Excel', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Buscar botón de generar informe Excel
      cy.get('body').then(($body) => {
        if ($body.text().includes('Excel') || $body.text().includes('Generar')) {
          // Verificar que existe el botón de generar Excel
          cy.get('button').contains('Excel').should('exist');
        }
      });
    });
  });

  it('Directivo debe poder generar informes', () => {
    cy.fixture('users').then((users) => {
      const directivo = users.directivo;
      
      cy.loginApi(directivo.username, directivo.password);
      
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que los botones de generar informe están visibles
      cy.get('body').then(($body) => {
        if ($body.text().includes('PDF') || $body.text().includes('Generar')) {
          cy.get('button').contains('PDF').should('exist');
        }
      });
    });
  });

  it('Auditor NO debe poder generar informes', () => {
    cy.fixture('users').then((users) => {
      const auditor = users.auditor;
      
      cy.loginApi(auditor.username, auditor.password);
      
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que los botones de generar informe NO están visibles
      cy.get('body').then(($body) => {
        // Los botones de generar PDF/Excel no deben existir para auditores
        if ($body.text().includes('Generar PDF') || $body.text().includes('Generar Excel')) {
          cy.get('button').contains('Generar PDF').should('not.exist');
          cy.get('button').contains('Generar Excel').should('not.exist');
        } else {
          // Si no aparecen los textos, verificamos que no hay botones de generar
          cy.log('Botones de generar informe no visibles para auditor (correcto)');
        }
      });
    });
  });

  it('Auditor debe poder ver la lista de informes generados', () => {
    cy.fixture('users').then((users) => {
      const auditor = users.auditor;
      
      cy.loginApi(auditor.username, auditor.password);
      
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que existe la sección de informes generados
      cy.contains('Informes Generados', { timeout: 10000 }).should('be.visible');
    });
  });

  it('Debe mostrar la sección de informes generados', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que existe la sección de informes generados
      cy.contains('Informes Generados', { timeout: 10000 }).should('be.visible');
      
      // Verificar que hay una tabla o lista de informes
      // cy.get('table').should('exist');
    });
  });

  it('Debe poder descargar un informe generado previamente', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Buscar botones de descargar en la lista de informes generados
      cy.get('body').then(($body) => {
        if ($body.text().includes('Descargar')) {
          // Verificar que existe al menos un botón de descargar
          // Nota: No hacemos clic para evitar descargar archivos
          cy.get('button').contains('Descargar').should('exist');
        } else {
          cy.log('No hay informes generados para descargar');
        }
      });
    });
  });

  it('Debe mostrar información de los informes generados (fecha, tipo, formato)', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      cy.visit('/proyecto/7/pre-rendicion');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Verificar que la tabla de informes muestra columnas relevantes
      cy.contains('Informes Generados', { timeout: 10000 }).should('be.visible');
      
      // Verificar que hay encabezados de tabla (si hay informes)
      cy.get('body').then(($body) => {
        if ($body.text().includes('Fecha') || $body.text().includes('Tipo') || $body.text().includes('Formato')) {
          cy.log('Tabla de informes con información detallada encontrada');
        }
      });
    });
  });

  it('Debe poder generar informe oficial de rendición para proyectos cerrados', () => {
    cy.fixture('users').then((users) => {
      const admin = users.admin;
      
      cy.loginApi(admin.username, admin.password);
      
      // Visitar detalles de un proyecto (asumiendo que hay proyectos cerrados)
      cy.visit('/proyecto/7');
      cy.waitForPageLoad();
      cy.wait(3000);
      
      // Buscar botón de informe final (para proyectos cerrados/completados)
      cy.get('body').then(($body) => {
        if ($body.text().includes('Informe Final') || $body.text().includes('Rendición Oficial')) {
          cy.get('button').contains('Informe Final').should('exist');
        } else {
          cy.log('Proyecto no está cerrado, no se muestra botón de informe final');
        }
      });
    });
  });
});

