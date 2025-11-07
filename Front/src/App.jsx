// src/App.jsx

import { useState, useEffect } from 'react';
import './App.css'; 

function App() {
  
  // 1. "estado" (memoria) para guardar la lista de proyectos.
  // Inicia como un array vacío [].
  const [proyectos, setProyectos] = useState([]);

  // 2. Se ejecuta solo una vez, cuando el componente carga.
  useEffect(() => {
    
    // URL de la API en Django
    //const apiUrl = 'http://127.0.0.1:8000/api/proyectos/';

    //console.log('Buscando datos en:', apiUrl);

    // 3. Llamada "fetch" 
    fetch('/api/proyectos/')
      .then(response => response.json()) // Convierte la respuesta a JSON
      .then(data => {
        // 4. Los datos recibidos se guardan en el estado
        console.log('Datos recibidos:', data);
        setProyectos(data);
      })
      .catch(error => {
        // Maneja cualquier error que ocurra durante la llamada
        console.error('Error al cargar los proyectos:', error);
      });

  }, []); // Ejecuta esto solo la primera vez

  // 5. HTML
  return (
    <div className="App">
      <header className="App-header">
        <h1>Proyectos de Sum-Arte</h1>
        <p>Datos cargados desde la API de Django:</p>
        
        {/* 6. Mapeao lista de proyectos */}
        <ul>
          {proyectos.map(proyecto => (
            <li key={proyecto.id}>
              {proyecto.nombre_proyecto}
            </li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;
