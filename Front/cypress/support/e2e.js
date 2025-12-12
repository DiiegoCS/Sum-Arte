// ***********************************************************
// Este archivo se procesa automáticamente antes de cargar los tests.
// ***********************************************************

// Importar comandos personalizados
import './commands';

// Configuración global para manejar excepciones no capturadas
Cypress.on('uncaught:exception', (err, runnable) => {
  // Retornar false previene que Cypress falle la prueba
  // Útil para ignorar errores de librerías de terceros o errores esperados
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  // Permitir que otros errores fallen la prueba
  return true;
});

// Configuración para limpiar localStorage antes de cada prueba
beforeEach(() => {
  // Limpiar localStorage y sessionStorage antes de cada prueba
  cy.clearLocalStorage();
  cy.clearCookies();
});

