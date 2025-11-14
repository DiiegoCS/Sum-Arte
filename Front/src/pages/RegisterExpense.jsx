import React from 'react';
import { Link } from 'react-router-dom';

function RegisterExpense() {
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="card-title text-center mb-4">Registrar Nuevo Gasto</h1>
              
              <form>
                {/* Título del Gasto */}
                <div className="mb-3">
                  <label htmlFor="expenseTitle" className="form-label">Título del Gasto</label>
                  <input type="text" className="form-control" id="expenseTitle" placeholder="Ej. Cena de equipo en..." />
                </div>

                {/* Monto y Fecha */}
                <div className="row mb-3">
                  <div className="col">
                    <label htmlFor="amount" className="form-label">Monto</label>
                    <input type="number" className="form-control" id="amount" placeholder="150.00" />
                  </div>
                  <div className="col">
                    <label htmlFor="expenseDate" className="form-label">Fecha del Gasto</label>
                    <input type="date" className="form-control" id="expenseDate" />
                  </div>
                </div>

                {/* Proyecto y Ítem Presupuestario (Listas desplegables) */}
                <div className="row mb-3">
                  <div className="col">
                    <label htmlFor="project" className="form-label">Proyecto</label>
                    <select id="project" className="form-select">
                      <option selected>Seleccionar un proyecto...</option>
                      {/* Carga los proyectos desde la API */}
                    </select>
                  </div>
                  <div className="col">
                    <label htmlFor="budgetItem" className="form-label">Ítem Presupuestario</label>
                    <select id="budgetItem" className="form-select">
                      <option selected>Seleccionar un ítem...</option>
                      {/* Crg los ítems desde la API */}
                    </select>
                  </div>
                </div>

                {/* Cargar Documento */}
                <div className="mb-3">
                  <label htmlFor="supportingDocument" className="form-label">Documento de Respaldo</label>
                  <input className="form-control" type="file" id="supportingDocument" />
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