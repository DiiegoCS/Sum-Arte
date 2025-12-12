/**
 * Script para mergear reportes de Mochawesome
 * Compatible con Windows y Linux/Mac
 */

import { merge } from 'mochawesome-merge';
import { create } from 'mochawesome-report-generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const reportsDir = path.join(__dirname, '..', 'cypress', 'reports');
const mergedJsonPath = path.join(reportsDir, 'merged.json');

/**
 * Busca archivos que coincidan con un patrón usando fs.readdirSync
 * Compatible con Windows y Linux/Mac
 */
function findFiles(dir, pattern) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.match(pattern)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error al leer directorio ${dir}:`, error.message);
  }
  return files;
}

async function mergeReports() {
  try {
    // Verificar que el directorio de reportes existe
    if (!fs.existsSync(reportsDir)) {
      console.log('⚠️  El directorio de reportes no existe:', reportsDir);
      return;
    }

    // Buscar todos los archivos JSON de reportes (excluyendo merged.json)
    const allFiles = findFiles(reportsDir, /^mochawesome.*\.json$/);
    const jsonFiles = allFiles.filter(file => 
      path.basename(file) !== 'merged.json'
    );
    
    if (jsonFiles.length === 0) {
      console.log('⚠️  No se encontraron archivos JSON de reportes para mergear.');
      console.log(`   Buscando en: ${reportsDir}`);
      return;
    }

    console.log(`📊 Encontrados ${jsonFiles.length} archivo(s) de reporte para mergear:`);
    jsonFiles.forEach(file => {
      console.log(`   - ${path.basename(file)}`);
    });

    // Mergear los reportes
    console.log('\n🔄 Mergeando reportes...');
    const mergedReport = await merge({
      files: jsonFiles,
    });

    // Guardar el reporte mergeado
    fs.writeFileSync(mergedJsonPath, JSON.stringify(mergedReport, null, 2));
    console.log(`✅ Reporte mergeado guardado en: ${path.basename(mergedJsonPath)}`);

    // Generar el reporte HTML
    console.log('\n📄 Generando reporte HTML...');
    const htmlReport = await create(mergedReport, {
      reportDir: reportsDir,
      inline: true,
      overwrite: true,
    });

    console.log(`\n✅ Reporte HTML generado exitosamente:`);
    htmlReport.forEach(report => {
      console.log(`   - ${report}`);
    });
    console.log('\n✨ ¡Proceso completado!');

  } catch (error) {
    console.error('❌ Error al mergear reportes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

mergeReports();

