const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // Puerto por defecto de Vite en desarrollo
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false, // Desactivar video para acelerar las pruebas (activar si necesitas debug)
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    // Configuración para ignorar errores de la aplicación durante las pruebas
    setupNodeEvents(on, config) {
      // implementar event listeners aquí si es necesario
      return config;
    },
  },
  // Configuración del reporter mochawesome
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: true,
    json: true,
    timestamp: 'mmddyyyy_HHMMss',
  },
});

