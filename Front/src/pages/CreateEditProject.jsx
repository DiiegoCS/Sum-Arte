/**
 * Página para crear y editar proyectos en Sum-Arte.
 * 
 * Solo disponible para usuarios administradores de proyecto.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, createProject, updateProject } from '../services/projectService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente para crear o editar un proyecto.
 */
const CreateEditProject = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre_proyecto: '',
    fecha_inicio_proyecto: '',
    fecha_fin_proyecto: '',
    presupuesto_total: '',
    estado_proyecto: 'inactivo'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      cargarProyecto();
    }
  }, [id]);

  /**
   * Carga los datos del proyecto para edición.
   */
  const cargarProyecto = async () => {
    try {
      setLoading(true);
      const proyecto = await getProject(id);
      
      // Formatear fechas para el input type="date"
      setFormData({
        nombre_proyecto: proyecto.nombre_proyecto || '',
        fecha_inicio_proyecto: proyecto.fecha_inicio_proyecto 
          ? new Date(proyecto.fecha_inicio_proyecto).toISOString().split('T')[0]
          : '',
        fecha_fin_proyecto: proyecto.fecha_fin_proyecto
          ? new Date(proyecto.fecha_fin_proyecto).toISOString().split('T')[0]
          : '',
        presupuesto_total: proyecto.presupuesto_total || '',
        estado_proyecto: proyecto.estado_proyecto || 'inactivo'
      });
    } catch (error) {
      console.error('Error al cargar proyecto:', error);
      toast.error('Error al cargar los datos del proyecto');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja los cambios en los campos del formulario.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Valida el formulario antes de enviar.
   */
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nombre_proyecto || formData.nombre_proyecto.trim().length < 3) {
      newErrors.nombre_proyecto = 'El nombre del proyecto debe tener al menos 3 caracteres.';
    }
    
    if (!formData.fecha_inicio_proyecto) {
      newErrors.fecha_inicio_proyecto = 'La fecha de inicio es requerida.';
    }
    
    if (!formData.fecha_fin_proyecto) {
      newErrors.fecha_fin_proyecto = 'La fecha de fin es requerida.';
    }
    
    if (formData.fecha_inicio_proyecto && formData.fecha_fin_proyecto) {
      const fechaInicio = new Date(formData.fecha_inicio_proyecto);
      const fechaFin = new Date(formData.fecha_fin_proyecto);
      
      if (fechaFin < fechaInicio) {
        newErrors.fecha_fin_proyecto = 'La fecha de fin debe ser posterior a la fecha de inicio.';
      }
    }
    
    if (!formData.presupuesto_total || parseFloat(formData.presupuesto_total) <= 0) {
      newErrors.presupuesto_total = 'El presupuesto total debe ser mayor a cero.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Maneja el envío del formulario.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija los errores en el formulario');
      return;
    }
    
    setSaving(true);
    
    try {
      const proyectoData = {
        nombre_proyecto: formData.nombre_proyecto.trim(),
        fecha_inicio_proyecto: formData.fecha_inicio_proyecto,
        fecha_fin_proyecto: formData.fecha_fin_proyecto,
        presupuesto_total: parseFloat(formData.presupuesto_total),
        estado_proyecto: formData.estado_proyecto
      };
      
      if (isEditMode) {
        await updateProject(id, proyectoData);
        toast.success('Proyecto actualizado exitosamente');
      } else {
        const nuevoProyecto = await createProject(proyectoData);
        toast.success('Proyecto creado exitosamente');
        navigate(`/proyecto/${nuevoProyecto.id}`);
        return;
      }
      
      // Redirigir al detalle del proyecto después de actualizar
      setTimeout(() => {
        navigate(`/proyecto/${id}`);
      }, 1500);
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
      
      // Manejar errores de validación del backend
      if (error.response?.data) {
        const backendErrors = error.response.data;
        
        // Si hay errores de campo específicos, mostrarlos
        const fieldErrors = {};
        Object.keys(backendErrors).forEach(key => {
          if (Array.isArray(backendErrors[key])) {
            fieldErrors[key] = backendErrors[key][0];
          } else if (typeof backendErrors[key] === 'string') {
            fieldErrors[key] = backendErrors[key];
          }
        });
        
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
        
        // Mostrar mensaje general si hay error no relacionado con campos
        const errorMessage = backendErrors.error || backendErrors.detail || 'Error al guardar el proyecto';
        toast.error(errorMessage);
      } else {
        toast.error('Error al guardar el proyecto');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>{isEditMode ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}</h1>
          <p className="text-muted">
            {isEditMode 
              ? 'Modifica la información del proyecto' 
              : 'Completa los datos para crear un nuevo proyecto'}
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate(isEditMode ? `/proyecto/${id}` : '/')}
          disabled={saving}
        >
          {isEditMode ? 'Cancelar' : 'Volver'}
        </button>
      </div>

      {/* Formulario */}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Nombre del Proyecto */}
              <div className="col-md-12 mb-3">
                <label htmlFor="nombre_proyecto" className="form-label">
                  Nombre del Proyecto <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.nombre_proyecto ? 'is-invalid' : ''}`}
                  id="nombre_proyecto"
                  name="nombre_proyecto"
                  value={formData.nombre_proyecto}
                  onChange={handleChange}
                  placeholder="Ej: Festival de Arte Contemporáneo 2024"
                  required
                  disabled={saving}
                />
                {errors.nombre_proyecto && (
                  <div className="invalid-feedback">{errors.nombre_proyecto}</div>
                )}
              </div>

              {/* Fecha de Inicio */}
              <div className="col-md-6 mb-3">
                <label htmlFor="fecha_inicio_proyecto" className="form-label">
                  Fecha de Inicio <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className={`form-control ${errors.fecha_inicio_proyecto ? 'is-invalid' : ''}`}
                  id="fecha_inicio_proyecto"
                  name="fecha_inicio_proyecto"
                  value={formData.fecha_inicio_proyecto}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
                {errors.fecha_inicio_proyecto && (
                  <div className="invalid-feedback">{errors.fecha_inicio_proyecto}</div>
                )}
              </div>

              {/* Fecha de Fin */}
              <div className="col-md-6 mb-3">
                <label htmlFor="fecha_fin_proyecto" className="form-label">
                  Fecha de Fin <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className={`form-control ${errors.fecha_fin_proyecto ? 'is-invalid' : ''}`}
                  id="fecha_fin_proyecto"
                  name="fecha_fin_proyecto"
                  value={formData.fecha_fin_proyecto}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
                {errors.fecha_fin_proyecto && (
                  <div className="invalid-feedback">{errors.fecha_fin_proyecto}</div>
                )}
              </div>

              {/* Presupuesto Total */}
              <div className="col-md-6 mb-3">
                <label htmlFor="presupuesto_total" className="form-label">
                  Presupuesto Total (CLP) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${errors.presupuesto_total ? 'is-invalid' : ''}`}
                  id="presupuesto_total"
                  name="presupuesto_total"
                  value={formData.presupuesto_total}
                  onChange={handleChange}
                  placeholder="Ej: 5000000"
                  min="0"
                  step="0.01"
                  required
                  disabled={saving}
                />
                {errors.presupuesto_total && (
                  <div className="invalid-feedback">{errors.presupuesto_total}</div>
                )}
                <small className="form-text text-muted">
                  Ingrese el presupuesto total asignado al proyecto en pesos chilenos.
                </small>
              </div>

              {/* Estado del Proyecto */}
              <div className="col-md-6 mb-3">
                <label htmlFor="estado_proyecto" className="form-label">
                  Estado del Proyecto
                </label>
                <select
                  className="form-control"
                  id="estado_proyecto"
                  name="estado_proyecto"
                  value={formData.estado_proyecto}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="inactivo">Inactivo</option>
                  <option value="activo">Activo</option>
                  <option value="en_pausa">En Pausa</option>
                  <option value="completado">Completado</option>
                </select>
                <small className="form-text text-muted">
                  El estado inicial por defecto es "Inactivo". Puede cambiarlo después de crear el proyecto.
                </small>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(isEditMode ? `/proyecto/${id}` : '/')}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className={`bi bi-${isEditMode ? 'check' : 'plus'}-circle me-2`}></i>
                    {isEditMode ? 'Guardar Cambios' : 'Crear Proyecto'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEditProject;

