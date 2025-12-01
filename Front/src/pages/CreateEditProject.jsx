/**
 * Página para crear y editar proyectos en Sum-Arte.
 * 
 * Incluye gestión completa de items y subitems presupuestarios con categorías.
 * Solo disponible para usuarios administradores de proyecto.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getProject, 
  createProject, 
  updateProject,
  getBudgetItems,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  createSubitem,
  updateSubitem,
  deleteSubitem
} from '../services/projectService';
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
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [expandedItems, setExpandedItems] = useState(new Set());

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

      // Cargar items presupuestarios
      let itemsCargados = [];
      if (proyecto.items_presupuestarios && proyecto.items_presupuestarios.length > 0) {
        itemsCargados = proyecto.items_presupuestarios.map(item => ({
          id: item.id,
          nombre_item_presupuesto: item.nombre_item_presupuesto,
          monto_asignado_item: item.monto_asignado_item,
          categoria_item: item.categoria_item || '',
          subitems: (item.subitems || []).map(subitem => ({
            id: subitem.id,
            nombre_subitem_presupuesto: subitem.nombre_subitem_presupuesto,
            monto_asignado_subitem: subitem.monto_asignado_subitem,
            categoria_subitem: subitem.categoria_subitem || ''
          }))
        }));
      } else {
        // Si no hay items en el proyecto, cargar desde la API
        const itemsData = await getBudgetItems(id);
        itemsCargados = itemsData.map(item => ({
          id: item.id,
          nombre_item_presupuesto: item.nombre_item_presupuesto,
          monto_asignado_item: item.monto_asignado_item,
          categoria_item: item.categoria_item || '',
          subitems: (item.subitems || []).map(subitem => ({
            id: subitem.id,
            nombre_subitem_presupuesto: subitem.nombre_subitem_presupuesto,
            monto_asignado_subitem: subitem.monto_asignado_subitem,
            categoria_subitem: subitem.categoria_subitem || ''
          }))
        }));
      }
      
      setItems(itemsCargados);
      
      // Expandir automáticamente todos los items al cargar en modo edición para facilitar la visualización y edición
      const todosLosItems = new Set();
      itemsCargados.forEach((item, index) => {
        todosLosItems.add(index);
      });
      setExpandedItems(todosLosItems);
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
   * Calcula el total asignado en items.
   */
  const calcularTotalAsignado = () => {
    return items.reduce((total, item) => {
      const montoItem = parseFloat(item.monto_asignado_item) || 0;
      const montoSubitems = item.subitems.reduce((sum, subitem) => {
        return sum + (parseFloat(subitem.monto_asignado_subitem) || 0);
      }, 0);
      // Si tiene subitems, usar la suma de subitems; si no, usar el monto del item
      return total + (montoSubitems > 0 ? montoSubitems : montoItem);
    }, 0);
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

    // Validar items
    items.forEach((item, index) => {
      if (!item.nombre_item_presupuesto || item.nombre_item_presupuesto.trim().length < 2) {
        newErrors[`item_${index}_nombre`] = 'El nombre del ítem debe tener al menos 2 caracteres.';
      }
      const montoItem = parseFloat(item.monto_asignado_item) || 0;
      const montoSubitems = item.subitems.reduce((sum, subitem) => {
        return sum + (parseFloat(subitem.monto_asignado_subitem) || 0);
      }, 0);
      
      if (montoSubitems > 0 && montoItem > 0) {
        // Si tiene subitems, el monto del item debe ser 0 o igual a la suma de subitems
        if (montoItem !== montoSubitems && montoItem !== 0) {
          newErrors[`item_${index}_monto`] = 'Si tiene subítems, el monto del ítem debe ser 0 o igual a la suma de subítems.';
        }
      } else if (montoItem <= 0) {
        newErrors[`item_${index}_monto`] = 'El monto asignado debe ser mayor a cero.';
      }

      // Validar subitems
      item.subitems.forEach((subitem, subIndex) => {
        if (!subitem.nombre_subitem_presupuesto || subitem.nombre_subitem_presupuesto.trim().length < 2) {
          newErrors[`item_${index}_subitem_${subIndex}_nombre`] = 'El nombre del subítem debe tener al menos 2 caracteres.';
        }
        if (!subitem.monto_asignado_subitem || parseFloat(subitem.monto_asignado_subitem) <= 0) {
          newErrors[`item_${index}_subitem_${subIndex}_monto`] = 'El monto asignado debe ser mayor a cero.';
        }
      });
    });

    // Validar que el total no exceda el presupuesto
    const totalAsignado = calcularTotalAsignado();
    const presupuestoTotal = parseFloat(formData.presupuesto_total) || 0;
    if (totalAsignado > presupuestoTotal) {
      newErrors.presupuesto_total = `El total asignado ($${totalAsignado.toLocaleString('es-CL')}) excede el presupuesto total ($${presupuestoTotal.toLocaleString('es-CL')}).`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Agrega un nuevo item.
   */
  const agregarItem = () => {
    setItems([...items, {
      id: null,
      nombre_item_presupuesto: '',
      monto_asignado_item: '',
      categoria_item: '',
      subitems: []
    }]);
  };

  /**
   * Elimina un item.
   */
  const eliminarItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    // Limpiar errores relacionados
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`item_${index}_`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  /**
   * Actualiza un item.
   */
  const actualizarItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    
    // Limpiar error del campo
    const errorKey = `item_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  /**
   * Agrega un subitem a un item.
   */
  const agregarSubitem = (itemIndex) => {
    const newItems = [...items];
    newItems[itemIndex].subitems = [
      ...newItems[itemIndex].subitems,
      {
        id: null,
        nombre_subitem_presupuesto: '',
        monto_asignado_subitem: '',
        categoria_subitem: ''
      }
    ];
    setItems(newItems);
  };

  /**
   * Elimina un subitem.
   */
  const eliminarSubitem = (itemIndex, subitemIndex) => {
    const newItems = [...items];
    newItems[itemIndex].subitems = newItems[itemIndex].subitems.filter((_, i) => i !== subitemIndex);
    setItems(newItems);
    
    // Limpiar errores relacionados
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`item_${itemIndex}_subitem_${subitemIndex}_`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  /**
   * Actualiza un subitem.
   */
  const actualizarSubitem = (itemIndex, subitemIndex, field, value) => {
    const newItems = [...items];
    newItems[itemIndex].subitems[subitemIndex] = {
      ...newItems[itemIndex].subitems[subitemIndex],
      [field]: value
    };
    setItems(newItems);
    
    // Limpiar error del campo
    const errorKey = `item_${itemIndex}_subitem_${subitemIndex}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  /**
   * Toggle para expandir/colapsar un item.
   */
  const toggleItem = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
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
      // Primero crear/actualizar el proyecto
      const proyectoData = {
        nombre_proyecto: formData.nombre_proyecto.trim(),
        fecha_inicio_proyecto: formData.fecha_inicio_proyecto,
        fecha_fin_proyecto: formData.fecha_fin_proyecto,
        presupuesto_total: parseFloat(formData.presupuesto_total),
        estado_proyecto: formData.estado_proyecto
      };
      
      let proyectoId = id;
      if (isEditMode) {
        await updateProject(proyectoId, proyectoData);
        toast.success('Proyecto actualizado exitosamente');
      } else {
        const nuevoProyecto = await createProject(proyectoData);
        proyectoId = nuevoProyecto.id;
        toast.success('Proyecto creado exitosamente');
      }

      // Luego crear/actualizar items y subitems
      for (const item of items) {
        const itemData = {
          proyecto: proyectoId,
          nombre_item_presupuesto: item.nombre_item_presupuesto.trim(),
          monto_asignado_item: parseFloat(item.monto_asignado_item) || 0,
          categoria_item: item.categoria_item.trim() || null
        };

        let itemId;
        if (item.id) {
          // Actualizar item existente
          await updateBudgetItem(item.id, itemData);
          itemId = item.id;
          
          // Si estamos editando, eliminar subitems que fueron removidos
          if (isEditMode) {
            const itemsCompletos = await getBudgetItems(proyectoId);
            const itemExistente = itemsCompletos.find(i => i.id === item.id);
            if (itemExistente && itemExistente.subitems) {
              const subitemsIdsActuales = item.subitems.filter(subitem => subitem.id).map(subitem => subitem.id);
              const subitemsAEliminar = itemExistente.subitems.filter(subitem => !subitemsIdsActuales.includes(subitem.id));
              
              for (const subitem of subitemsAEliminar) {
                await deleteSubitem(subitem.id);
              }
            }
          }
        } else {
          // Crear nuevo item
          const nuevoItem = await createBudgetItem(itemData);
          itemId = nuevoItem.id;
        }

        // Gestionar subitems
        for (const subitem of item.subitems) {
          const subitemData = {
            item_presupuesto: itemId,
            nombre_subitem_presupuesto: subitem.nombre_subitem_presupuesto.trim(),
            monto_asignado_subitem: parseFloat(subitem.monto_asignado_subitem),
            categoria_subitem: subitem.categoria_subitem.trim() || null
          };

          if (subitem.id) {
            // Actualizar subitem existente
            await updateSubitem(subitem.id, subitemData);
          } else {
            // Crear nuevo subitem
            await createSubitem(subitemData);
          }
        }
      }

      // Eliminar items que ya no están en la lista (solo en modo edición)
      if (isEditMode) {
        const itemsExistentes = await getBudgetItems(proyectoId);
        const itemsIdsActuales = items.filter(item => item.id).map(item => item.id);
        const itemsAEliminar = itemsExistentes.filter(item => !itemsIdsActuales.includes(item.id));
        
        for (const item of itemsAEliminar) {
          await deleteBudgetItem(item.id);
        }
      }

      toast.success(isEditMode ? 'Proyecto y presupuesto actualizados exitosamente' : 'Proyecto y presupuesto creados exitosamente');
      
      // Redirigir al detalle del proyecto
      setTimeout(() => {
        navigate(`/proyecto/${proyectoId}`);
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

  const totalAsignado = calcularTotalAsignado();
  const presupuestoTotal = parseFloat(formData.presupuesto_total) || 0;
  const saldoDisponible = presupuestoTotal - totalAsignado;

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>{isEditMode ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}</h1>
          <p className="text-muted">
            {isEditMode 
              ? 'Modifica la información del proyecto y su presupuesto' 
              : 'Completa los datos para crear un nuevo proyecto y configurar su presupuesto'}
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

      <form onSubmit={handleSubmit}>
        {/* Información Básica del Proyecto */}
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Información Básica del Proyecto</h5>
          </div>
          <div className="card-body">
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
          </div>
        </div>

        {/* Items Presupuestarios */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Ítems Presupuestarios</h5>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={agregarItem}
              disabled={saving}
            >
              <i className="bi bi-plus-circle me-1"></i>
              Agregar Ítem
            </button>
          </div>
          <div className="card-body">
            {items.length === 0 ? (
              <p className="text-muted text-center py-3">
                No hay ítems presupuestarios. Haga clic en "Agregar Ítem" para comenzar.
              </p>
            ) : (
              <>
                {items.map((item, itemIndex) => {
                  const montoItem = parseFloat(item.monto_asignado_item) || 0;
                  const montoSubitems = item.subitems.reduce((sum, subitem) => {
                    return sum + (parseFloat(subitem.monto_asignado_subitem) || 0);
                  }, 0);
                  const montoTotalItem = montoSubitems > 0 ? montoSubitems : montoItem;
                  const isExpanded = expandedItems.has(itemIndex);

                  return (
                    <div key={itemIndex} className="card mb-3">
                      <div className="card-header bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="flex-grow-1">
                            <input
                              type="text"
                              className={`form-control form-control-sm d-inline-block ${errors[`item_${itemIndex}_nombre`] ? 'is-invalid' : ''}`}
                              style={{ width: '300px' }}
                              placeholder="Nombre del ítem"
                              value={item.nombre_item_presupuesto}
                              onChange={(e) => actualizarItem(itemIndex, 'nombre_item_presupuesto', e.target.value)}
                              disabled={saving}
                            />
                            {errors[`item_${itemIndex}_nombre`] && (
                              <div className="invalid-feedback d-block">{errors[`item_${itemIndex}_nombre`]}</div>
                            )}
                          </div>
                          <div className="d-flex gap-2 align-items-center">
                            <span className="badge bg-info">
                              Total: ${montoTotalItem.toLocaleString('es-CL')}
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => toggleItem(itemIndex)}
                              disabled={saving}
                            >
                              <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => eliminarItem(itemIndex)}
                              disabled={saving}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="card-body">
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <label className="form-label">Monto Asignado (CLP) <span className="text-danger">*</span></label>
                              <input
                                type="number"
                                className={`form-control ${errors[`item_${itemIndex}_monto`] ? 'is-invalid' : ''}`}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={item.monto_asignado_item}
                                onChange={(e) => actualizarItem(itemIndex, 'monto_asignado_item', e.target.value)}
                                disabled={saving || item.subitems.length > 0}
                              />
                              {errors[`item_${itemIndex}_monto`] && (
                                <div className="invalid-feedback">{errors[`item_${itemIndex}_monto`]}</div>
                              )}
                              {item.subitems.length > 0 && (
                                <small className="form-text text-muted">
                                  El monto se calcula automáticamente desde los subítems.
                                </small>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Categoría</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Ej: Materiales, Servicios, etc."
                                value={item.categoria_item}
                                onChange={(e) => actualizarItem(itemIndex, 'categoria_item', e.target.value)}
                                disabled={saving}
                              />
                            </div>
                          </div>

                          {/* Subitems */}
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h6 className="mb-0">Subítems</h6>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => agregarSubitem(itemIndex)}
                                disabled={saving}
                              >
                                <i className="bi bi-plus-circle me-1"></i>
                                Agregar Subítem
                              </button>
                            </div>
                            {item.subitems.length === 0 ? (
                              <p className="text-muted small">No hay subítems. Puede agregar subítems o usar el monto del ítem directamente.</p>
                            ) : (
                              <div className="table-responsive">
                                <table className="table table-sm table-bordered">
                                  <thead>
                                    <tr>
                                      <th>Nombre</th>
                                      <th>Monto (CLP)</th>
                                      <th>Categoría</th>
                                      <th>Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.subitems.map((subitem, subitemIndex) => (
                                      <tr key={subitemIndex}>
                                        <td>
                                          <input
                                            type="text"
                                            className={`form-control form-control-sm ${errors[`item_${itemIndex}_subitem_${subitemIndex}_nombre`] ? 'is-invalid' : ''}`}
                                            placeholder="Nombre del subítem"
                                            value={subitem.nombre_subitem_presupuesto}
                                            onChange={(e) => actualizarSubitem(itemIndex, subitemIndex, 'nombre_subitem_presupuesto', e.target.value)}
                                            disabled={saving}
                                          />
                                          {errors[`item_${itemIndex}_subitem_${subitemIndex}_nombre`] && (
                                            <div className="invalid-feedback d-block">{errors[`item_${itemIndex}_subitem_${subitemIndex}_nombre`]}</div>
                                          )}
                                        </td>
                                        <td>
                                          <input
                                            type="number"
                                            className={`form-control form-control-sm ${errors[`item_${itemIndex}_subitem_${subitemIndex}_monto`] ? 'is-invalid' : ''}`}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            value={subitem.monto_asignado_subitem}
                                            onChange={(e) => actualizarSubitem(itemIndex, subitemIndex, 'monto_asignado_subitem', e.target.value)}
                                            disabled={saving}
                                          />
                                          {errors[`item_${itemIndex}_subitem_${subitemIndex}_monto`] && (
                                            <div className="invalid-feedback d-block">{errors[`item_${itemIndex}_subitem_${subitemIndex}_monto`]}</div>
                                          )}
                                        </td>
                                        <td>
                                          <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Categoría"
                                            value={subitem.categoria_subitem}
                                            onChange={(e) => actualizarSubitem(itemIndex, subitemIndex, 'categoria_subitem', e.target.value)}
                                            disabled={saving}
                                          />
                                        </td>
                                        <td>
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => eliminarSubitem(itemIndex, subitemIndex)}
                                            disabled={saving}
                                          >
                                            <i className="bi bi-trash"></i>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Resumen del Presupuesto */}
            {items.length > 0 && (
              <div className="mt-3 p-3 bg-light rounded">
                <div className="row">
                  <div className="col-md-4">
                    <strong>Presupuesto Total:</strong> ${presupuestoTotal.toLocaleString('es-CL')}
                  </div>
                  <div className="col-md-4">
                    <strong>Total Asignado:</strong> ${totalAsignado.toLocaleString('es-CL')}
                  </div>
                  <div className="col-md-4">
                    <strong className={saldoDisponible < 0 ? 'text-danger' : 'text-success'}>
                      Saldo Disponible: ${saldoDisponible.toLocaleString('es-CL')}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="d-flex justify-content-end gap-2 mb-4">
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
  );
};

export default CreateEditProject;
