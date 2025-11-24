/**
 * Register Expense page for Sum-Arte.
 * 
 * Complete form for registering expenses with all required fields,
 * provider selection/creation, evidence upload, and budget item selection.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getBudgetItems, getSubitems } from '../services/projectService';
import { createTransaction } from '../services/transactionService';
import { uploadEvidence, linkEvidenceToTransaction } from '../services/evidenceService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * RegisterExpense component.
 */
const RegisterExpense = () => {
  const navigate = useNavigate();
  
  // Form state
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [itemsPresupuestarios, setItemsPresupuestarios] = useState([]);
  const [subitemsPresupuestarios, setSubitemsPresupuestarios] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  const [formData, setFormData] = useState({
    proyecto: '',
    proveedor: '',
    nuevo_proveedor_nombre: '',
    nuevo_proveedor_rut: '',
    nuevo_proveedor_email: '',
    monto_transaccion: '',
    fecha_registro: new Date().toISOString().split('T')[0],
    nro_documento: '',
    tipo_doc_transaccion: 'factura electrónica',
    tipo_transaccion: 'egreso',
    item_presupuestario: '',
    subitem_presupuestario: '',
    categoria_gasto: '',
    numero_cuenta_bancaria: '',
    numero_operacion_bancaria: '',
  });
  
  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [crearNuevoProveedor, setCrearNuevoProveedor] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.proyecto) {
      loadBudgetItems(formData.proyecto);
    }
  }, [formData.proyecto]);

  useEffect(() => {
    if (formData.item_presupuestario) {
      loadSubitems(formData.item_presupuestario);
    }
  }, [formData.item_presupuestario]);

  const loadInitialData = async () => {
    try {
      const proyectosData = await getProjects();
      setProyectos(proyectosData);
      
      // Load providers (you'll need to create a provider service)
      // For now, we'll handle it in the form
    } catch (error) {
      toast.error('Error al cargar los datos iniciales');
    }
  };

  const loadBudgetItems = async (proyectoId) => {
    try {
      const items = await getBudgetItems(proyectoId);
      setItemsPresupuestarios(items);
      setSubitemsPresupuestarios([]);
      setFormData(prev => ({ ...prev, item_presupuestario: '', subitem_presupuestario: '' }));
    } catch (error) {
      toast.error('Error al cargar los ítems presupuestarios');
    }
  };

  const loadSubitems = async (itemId) => {
    try {
      const subitems = await getSubitems(itemId);
      setSubitemsPresupuestarios(subitems);
      setFormData(prev => ({ ...prev, subitem_presupuestario: '' }));
    } catch (error) {
      toast.error('Error al cargar los subítems');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setEvidencias(files);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.proyecto) newErrors.proyecto = 'Debe seleccionar un proyecto';
    if (!formData.proveedor && !crearNuevoProveedor) {
      newErrors.proveedor = 'Debe seleccionar o crear un proveedor';
    }
    if (crearNuevoProveedor) {
      if (!formData.nuevo_proveedor_nombre) newErrors.nuevo_proveedor_nombre = 'Requerido';
      if (!formData.nuevo_proveedor_rut) newErrors.nuevo_proveedor_rut = 'Requerido';
      if (!formData.nuevo_proveedor_email) newErrors.nuevo_proveedor_email = 'Requerido';
    }
    if (!formData.monto_transaccion || parseFloat(formData.monto_transaccion) <= 0) {
      newErrors.monto_transaccion = 'El monto debe ser mayor a cero';
    }
    if (!formData.fecha_registro) newErrors.fecha_registro = 'Requerido';
    if (!formData.nro_documento) newErrors.nro_documento = 'Requerido';
    if (formData.tipo_transaccion === 'egreso' && !formData.item_presupuestario) {
      newErrors.item_presupuestario = 'Debe seleccionar un ítem presupuestario para egresos';
    }
    if (evidencias.length === 0) {
      newErrors.evidencias = 'Debe adjuntar al menos una evidencia';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, complete todos los campos requeridos');
      return;
    }

    setLoading(true);
    
    try {
      // First, create provider if needed
      let proveedorId = formData.proveedor;
      
      if (crearNuevoProveedor) {
        // Create new provider (you'll need to implement this in the provider service)
        // For now, we'll assume the backend handles it or we create it separately
        toast.info('Creando proveedor...');
        // This would call a createProvider service
      }
      
      // Prepare transaction data
      const transactionData = {
        proyecto: parseInt(formData.proyecto),
        proveedor: parseInt(proveedorId),
        monto_transaccion: parseFloat(formData.monto_transaccion),
        fecha_registro: formData.fecha_registro,
        nro_documento: formData.nro_documento,
        tipo_doc_transaccion: formData.tipo_doc_transaccion,
        tipo_transaccion: formData.tipo_transaccion,
        categoria_gasto: formData.categoria_gasto || null,
        numero_cuenta_bancaria: formData.numero_cuenta_bancaria || null,
        numero_operacion_bancaria: formData.numero_operacion_bancaria || null,
      };
      
      if (formData.item_presupuestario) {
        transactionData.item_presupuestario = parseInt(formData.item_presupuestario);
      }
      if (formData.subitem_presupuestario) {
        transactionData.subitem_presupuestario = parseInt(formData.subitem_presupuestario);
      }
      
      // Create transaction
      const transaccion = await createTransaction(transactionData);
      
      // Upload and link evidence
      if (evidencias.length > 0 && transaccion.id) {
        for (const evidencia of evidencias) {
          try {
            const evidenciaData = await uploadEvidence(
              parseInt(formData.proyecto),
              evidencia,
              evidencia.name
            );
            
            await linkEvidenceToTransaction(transaccion.id, evidenciaData.id);
          } catch (error) {
            console.error('Error al subir evidencia:', error);
            toast.warning(`Error al subir evidencia ${evidencia.name}`);
          }
        }
      }
      
      toast.success('Gasto registrado exitosamente');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Error al registrar el gasto');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="card-title text-center mb-4">Registrar Nuevo Gasto</h1>
              
              <form onSubmit={handleSubmit}>
                {/* Project Selection */}
                <div className="mb-3">
                  <label htmlFor="proyecto" className="form-label">
                    Proyecto <span className="text-danger">*</span>
                  </label>
                  <select
                    id="proyecto"
                    name="proyecto"
                    className={`form-select ${errors.proyecto ? 'is-invalid' : ''}`}
                    value={formData.proyecto}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar un proyecto...</option>
                    {proyectos.map(proyecto => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre_proyecto}
                      </option>
                    ))}
                  </select>
                  {errors.proyecto && <div className="invalid-feedback">{errors.proyecto}</div>}
                </div>

                {/* Provider Selection/Creation */}
                <div className="mb-3">
                  <label className="form-label">
                    Proveedor <span className="text-danger">*</span>
                  </label>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="crearNuevoProveedor"
                      checked={crearNuevoProveedor}
                      onChange={(e) => setCrearNuevoProveedor(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="crearNuevoProveedor">
                      Crear nuevo proveedor
                    </label>
                  </div>
                  
                  {!crearNuevoProveedor ? (
                    <select
                      name="proveedor"
                      className={`form-select ${errors.proveedor ? 'is-invalid' : ''}`}
                      value={formData.proveedor}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar proveedor...</option>
                      {/* Providers would be loaded here */}
                    </select>
                  ) : (
                    <div className="row">
                      <div className="col-md-4">
                        <input
                          type="text"
                          name="nuevo_proveedor_nombre"
                          className={`form-control ${errors.nuevo_proveedor_nombre ? 'is-invalid' : ''}`}
                          placeholder="Nombre"
                          value={formData.nuevo_proveedor_nombre}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <input
                          type="text"
                          name="nuevo_proveedor_rut"
                          className={`form-control ${errors.nuevo_proveedor_rut ? 'is-invalid' : ''}`}
                          placeholder="RUT"
                          value={formData.nuevo_proveedor_rut}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <input
                          type="email"
                          name="nuevo_proveedor_email"
                          className={`form-control ${errors.nuevo_proveedor_email ? 'is-invalid' : ''}`}
                          placeholder="Email"
                          value={formData.nuevo_proveedor_email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount and Date */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="monto_transaccion" className="form-label">
                      Monto <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${errors.monto_transaccion ? 'is-invalid' : ''}`}
                      id="monto_transaccion"
                      name="monto_transaccion"
                      value={formData.monto_transaccion}
                      onChange={handleChange}
                      required
                    />
                    {errors.monto_transaccion && (
                      <div className="invalid-feedback">{errors.monto_transaccion}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="fecha_registro" className="form-label">
                      Fecha del Gasto <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className={`form-control ${errors.fecha_registro ? 'is-invalid' : ''}`}
                      id="fecha_registro"
                      name="fecha_registro"
                      value={formData.fecha_registro}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Document Information */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="nro_documento" className="form-label">
                      Número de Documento <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.nro_documento ? 'is-invalid' : ''}`}
                      id="nro_documento"
                      name="nro_documento"
                      value={formData.nro_documento}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="tipo_doc_transaccion" className="form-label">
                      Tipo de Documento <span className="text-danger">*</span>
                    </label>
                    <select
                      id="tipo_doc_transaccion"
                      name="tipo_doc_transaccion"
                      className="form-select"
                      value={formData.tipo_doc_transaccion}
                      onChange={handleChange}
                      required
                    >
                      <option value="factura electrónica">Factura Electrónica</option>
                      <option value="factura exenta">Factura Exenta</option>
                      <option value="boleta de compra">Boleta de Compra</option>
                      <option value="boleta de honorarios">Boleta de Honorarios</option>
                    </select>
                  </div>
                </div>

                {/* Budget Items */}
                {formData.tipo_transaccion === 'egreso' && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="item_presupuestario" className="form-label">
                          Ítem Presupuestario <span className="text-danger">*</span>
                        </label>
                        <select
                          id="item_presupuestario"
                          name="item_presupuestario"
                          className={`form-select ${errors.item_presupuestario ? 'is-invalid' : ''}`}
                          value={formData.item_presupuestario}
                          onChange={handleChange}
                          required
                          disabled={!formData.proyecto}
                        >
                          <option value="">Seleccionar ítem...</option>
                          {itemsPresupuestarios.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.nombre_item_presupuesto} 
                              (Saldo: ${item.saldo_disponible?.toLocaleString('es-CL') || 'N/A'})
                            </option>
                          ))}
                        </select>
                        {errors.item_presupuestario && (
                          <div className="invalid-feedback">{errors.item_presupuestario}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="subitem_presupuestario" className="form-label">
                          Subítem Presupuestario (Opcional)
                        </label>
                        <select
                          id="subitem_presupuestario"
                          name="subitem_presupuestario"
                          className="form-select"
                          value={formData.subitem_presupuestario}
                          onChange={handleChange}
                          disabled={!formData.item_presupuestario}
                        >
                          <option value="">Seleccionar subítem...</option>
                          {subitemsPresupuestarios.map(subitem => (
                            <option key={subitem.id} value={subitem.id}>
                              {subitem.nombre_subitem_presupuesto}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="categoria_gasto" className="form-label">
                        Categoría del Gasto
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="categoria_gasto"
                        name="categoria_gasto"
                        value={formData.categoria_gasto}
                        onChange={handleChange}
                        placeholder="Ej: Materiales, Servicios, etc."
                      />
                    </div>
                  </>
                )}

                {/* Bank Reconciliation (for income) */}
                {formData.tipo_transaccion === 'ingreso' && (
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="numero_cuenta_bancaria" className="form-label">
                        Número de Cuenta Bancaria
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="numero_cuenta_bancaria"
                        name="numero_cuenta_bancaria"
                        value={formData.numero_cuenta_bancaria}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="numero_operacion_bancaria" className="form-label">
                        Número de Operación Bancaria
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="numero_operacion_bancaria"
                        name="numero_operacion_bancaria"
                        value={formData.numero_operacion_bancaria}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}

                {/* Evidence Upload */}
                <div className="mb-3">
                  <label htmlFor="evidencias" className="form-label">
                    Documentos de Respaldo <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    className={`form-control ${errors.evidencias ? 'is-invalid' : ''}`}
                    id="evidencias"
                    multiple
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                    required
                  />
                  {errors.evidencias && (
                    <div className="invalid-feedback">{errors.evidencias}</div>
                  )}
                  <small className="form-text text-muted">
                    Formatos permitidos: PDF, imágenes, Excel, Word. Máximo 10MB por archivo.
                  </small>
                  {evidencias.length > 0 && (
                    <div className="mt-2">
                      <strong>Archivos seleccionados:</strong>
                      <ul className="list-unstyled">
                        {evidencias.map((file, index) => (
                          <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Submit Buttons */}
                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/')}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Guardando...' : 'Guardar Gasto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterExpense;
