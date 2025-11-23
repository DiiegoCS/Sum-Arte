import React from 'react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

function RegisterExpense() {
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [itemsPresupuestarios, setItemsPresupuestarios] = useState([]);
  const [titutloGasto, setTituloGasto] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaGasto, setFechaGasto] = useState('');
  const [itemPresupuestarioSeleccionado, setItemPresupuestarioSeleccionado] = useState(null);
  const [documentoRespaldo, setDocumentoRespaldo] = useState(null);

  /* Carga de proyectos */
  useEffect(() => {
    fetch('/api/proyectos/')
      .then(response => response.json())
      .then(data => {
        console.log('Datos recibidos:', data);
        setProyectos(data);
      })
      .catch(error => {
        console.error('Error al cargar los proyectos:', error);
      });
  }, []);

  /* Handler del onChange -> Proyectos */
  function handleProyectoChange(event) {
    const proyectoId = event.target.value;
    const proyecto = proyectos.find(p => p.id.toString() === proyectoId);
    setProyectoSeleccionado(proyecto);
  }

  /* Carga de ítems presupuestarios según el proyecto seleccionado */
  useEffect(() => {
    if (proyectoSeleccionado) {
      fetch(`/api/items-presupuestarios/?proyecto=${proyectoSeleccionado.id}`)
        .then(response => response.json())
        .then(data => {
          console.log('Ítems presupuestarios recibidos:', data);
          setItemsPresupuestarios(data);
        })
        .catch(error => {
          console.error('Error al cargar los ítems presupuestarios:', error);
        });
    }
  }, [proyectoSeleccionado]);

  /* Handler del onChange -> Ítems Presupuestarios */
  function handleItemPresupuestarioChange(event) {
    const itemId = event.target.value;
    const item = itemsPresupuestarios.find(i => i.id.toString() === itemId);
    setItemPresupuestarioSeleccionado(item);
  }

  function handleSubmit(event) {
    event.preventDefault(); // Evita que la página se recargue

    // Objeto FormData (necesario para subir archivos)
    const formData = new FormData();

    // Se adjuntan los datos
    formData.append('monto_transaccion', monto);
    formData.append('fecha_registro', fechaGasto);
    // El backend espera IDs para las llaves foráneas
    if (proyectoSeleccionado) formData.append('proyecto', proyectoSeleccionado.id);
    
    // OJO: Tu modelo Transaccion también pide 'usuario', 'proveedor' y 'nro_documento'.
    // valores "dummy" (falsos) para probar que la conexión funciona.
    formData.append('usuario', 3); // ID del superusuario
    formData.append('proveedor', 1); // Necesitaremos crear un proveedor con ID 1 en el admin
    formData.append('nro_documento', 'REF-' + Date.now()); // Un número único temporal
    
    // Adjuntamos el archivo (si existe)
    // OJO: Tu modelo Transaccion no tiene campo de archivo directo, 
    // tiene una relación con Evidencia. Esto es complejo.
    // POR AHORA: Vamos a intentar guardar la Transacción sola.
    
    // Envia los datos al backend
    fetch('/api/transacciones/', {
      method: 'POST',
      body: formData, 
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Error en la petición POST');
      }
    })
    .then(data => {
      console.log('Éxito:', data);
      alert('¡Gasto guardado correctamente!');
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Hubo un error al guardar el gasto.');
    });
  }
  
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="card-title text-center mb-4">Registrar Nuevo Gasto</h1>
              
              <form onSubmit={handleSubmit}>
                {/* Título del Gasto */}
                <div className="mb-3">
                  <label htmlFor="expenseTitle" className="form-label">Título del Gasto</label>
                  <input type="text" className="form-control" id="expenseTitle" placeholder="Ej. Compra de artículos..."
                  onChange={(e) => setTituloGasto(e.target.value)} />
                </div>

                {/* Monto y Fecha */}
                <div className="row mb-3">
                  <div className="col">
                    <label htmlFor="amount" className="form-label">Monto</label>
                    <input type="number" className="form-control" id="amount" placeholder="15000"
                    onChange={(e) => setMonto(e.target.value)} />
                  </div>
                  <div className="col">
                    <label htmlFor="expenseDate" className="form-label">Fecha del Gasto</label>
                    <input type="date" className="form-control" id="expenseDate" 
                    onChange={(e) => setFechaGasto(e.target.value)}/>
                  </div>
                </div>

                {/* Proyecto y Ítem Presupuestario (Listas desplegables) */}
                <div className="row mb-3">
                  <div className="col">
                    <label htmlFor="project" className="form-label">Proyecto</label>
                    <select id="project" className="form-select" onChange={handleProyectoChange}>
                      <option selected>Seleccionar un proyecto...</option>
                      {proyectos.map(proyecto => (
                        <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre_proyecto}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col">
                    <label htmlFor="budgetItem" className="form-label">Ítem Presupuestario</label>
                    <select id="budgetItem" className="form-select" onChange={handleItemPresupuestarioChange}>
                      <option selected>Seleccionar un ítem...</option>
                      {itemsPresupuestarios.map(item => (
                        <option key={item.id} value={item.id}>{item.nombre_item_presupuesto}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cargar Documento */}
                <div className="mb-3">
                  <label htmlFor="supportingDocument" className="form-label">Documento de Respaldo</label>
                  <input className="form-control" type="file" id="supportingDocument" 
                  onChange={(e) => setDocumentoRespaldo(e.target.files[0])}/>
                </div>
                
                {/* Botones de Acción */}
                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Link to="/" className="btn btn-secondary">Cancelar</Link>
                  <button type="submit" className="btn btn-primary">Guardar Gasto</button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterExpense;