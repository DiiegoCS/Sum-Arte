/**
 * Página para registrar un gasto en Sum-Arte.
 *
 * El formulario permite registrar un gasto con todos los campos requeridos,
 * seleccionar o crear un proveedor, adjuntar evidencias y elegir ítems presupuestarios.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getProjects, getBudgetItems, getSubitems } from '../services/projectService';
import { createTransaction, getTransaction, updateTransaction } from '../services/transactionService';
import { uploadEvidence, linkEvidenceToTransaction } from '../services/evidenceService';
import { createProvider, getProviders } from '../services/providerService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente para registrar un gasto.
 */
const RegisterExpense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transaccionIdEditar = searchParams.get('editar');

  // Estado del formulario
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [itemsPresupuestarios, setItemsPresupuestarios] = useState([]);
  const [subitemsPresupuestarios, setSubitemsPresupuestarios] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargandoTransaccion, setCargandoTransaccion] = useState(false);

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
    cargarDatosIniciales();
    
    // Si hay un ID de transacción en la URL, cargar los datos para edición
    if (transaccionIdEditar) {
      cargarTransaccionParaEditar(transaccionIdEditar);
    }
  }, [transaccionIdEditar]);

  useEffect(() => {
    if (formData.proyecto) {
      cargarItemsPresupuestarios(formData.proyecto);
    }
  }, [formData.proyecto]);

  useEffect(() => {
    if (formData.item_presupuestario) {
      cargarSubitems(formData.item_presupuestario);
    }
  }, [formData.item_presupuestario]);

  /**
   * Carga los proyectos y proveedores disponibles al momento de montar el componente.
   */
  const cargarDatosIniciales = async () => {
    try {
      const [proyectosData, proveedoresData] = await Promise.all([
        getProjects(),
        getProviders(),
      ]);
      
      // Asegurar que sean arrays
      setProyectos(Array.isArray(proyectosData) ? proyectosData : []);
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
    } catch (error) {
      toast.error('Ha ocurrido un error al cargar los datos iniciales');
      console.error('Error al cargar datos iniciales:', error);
      setProyectos([]);
      setProveedores([]);
    }
  };

  /**
   * Carga los ítems presupuestarios asociados al proyecto seleccionado.
   * @param {string} proyectoId
   */
  const cargarItemsPresupuestarios = async (proyectoId) => {
    try {
      const items = await getBudgetItems(proyectoId);
      // Asegurar que sea un array
      setItemsPresupuestarios(Array.isArray(items) ? items : []);
      setSubitemsPresupuestarios([]);
      setFormData(prev => ({ ...prev, item_presupuestario: '', subitem_presupuestario: '' }));
    } catch (error) {
      toast.error('Ha ocurrido un error al cargar los ítems presupuestarios');
      console.error('Error al cargar ítems presupuestarios:', error);
      setItemsPresupuestarios([]);
    }
  };

  /**
   * Carga los subítems asociados al ítem presupuestario seleccionado.
   * @param {string} itemId
   */
  const cargarSubitems = async (itemId) => {
    try {
      const subitems = await getSubitems(itemId);
      // Asegurar que sea un array
      setSubitemsPresupuestarios(Array.isArray(subitems) ? subitems : []);
      setFormData(prev => ({ ...prev, subitem_presupuestario: '' }));
    } catch (error) {
      toast.error('Ha ocurrido un error al cargar los subítems presupuestarios');
      console.error('Error al cargar subítems:', error);
      setSubitemsPresupuestarios([]);
    }
  };

  /**
   * Maneja el cambio de cualquier campo del formulario.
   * @param {object} e Evento de React
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpia el error para el campo modificado
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  /**
   * Maneja la carga de los archivos de evidencia en el formulario.
   * @param {object} e Evento de React
   */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setEvidencias(files);
  };

  /**
   * Valida que todos los campos requeridos del formulario estén completos correctamente.
   * @returns {boolean} true si el formulario es válido, false de lo contrario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.proyecto) nuevosErrores.proyecto = 'Debe seleccionar un proyecto';
    if (!formData.proveedor && !crearNuevoProveedor) {
      nuevosErrores.proveedor = 'Debe seleccionar o crear un proveedor';
    }
    if (crearNuevoProveedor) {
      if (!formData.nuevo_proveedor_nombre) nuevosErrores.nuevo_proveedor_nombre = 'Campo requerido';
      if (!formData.nuevo_proveedor_rut) nuevosErrores.nuevo_proveedor_rut = 'Campo requerido';
      if (!formData.nuevo_proveedor_email) nuevosErrores.nuevo_proveedor_email = 'Campo requerido';
    }
    if (!formData.monto_transaccion || parseFloat(formData.monto_transaccion) <= 0) {
      nuevosErrores.monto_transaccion = 'El monto debe ser mayor a cero';
    }
    if (!formData.fecha_registro) nuevosErrores.fecha_registro = 'Campo requerido';
    if (!formData.nro_documento) nuevosErrores.nro_documento = 'Campo requerido';
    if (formData.tipo_transaccion === 'egreso' && !formData.item_presupuestario) {
      nuevosErrores.item_presupuestario = 'Debe seleccionar un ítem presupuestario para egresos';
    }
    if (evidencias.length === 0) {
      nuevosErrores.evidencias = 'Debe adjuntar al menos una evidencia';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Maneja el envío del formulario de registro de gastos.
   * @param {object} e Evento de React
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      toast.error('Por favor, completar todos los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      // Si es necesario, primero crea el proveedor nuevo
      let proveedorId = formData.proveedor;

      if (crearNuevoProveedor) {
        toast.info('Creando nuevo proveedor...');
        try {
          const nuevoProveedor = await createProvider({
            nombre_proveedor: formData.nuevo_proveedor_nombre,
            rut_proveedor: formData.nuevo_proveedor_rut,
            email_proveedor: formData.nuevo_proveedor_email,
          });
          proveedorId = nuevoProveedor.id;
          toast.success('Proveedor creado exitosamente');
        } catch (error) {
          toast.error(error.message || 'Error al crear el proveedor. Verifique los datos ingresados.');
          setLoading(false);
          return;
        }
      }

      // Validar que tenemos un proveedor válido
      if (!proveedorId || isNaN(parseInt(proveedorId))) {
        toast.error('Debe seleccionar o crear un proveedor válido');
        setLoading(false);
        return;
      }

      // Prepara los datos para la transacción
      const datosTransaccion = {
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
        datosTransaccion.item_presupuestario = parseInt(formData.item_presupuestario);
      }
      if (formData.subitem_presupuestario) {
        datosTransaccion.subitem_presupuestario = parseInt(formData.subitem_presupuestario);
      }

      // Se crea o actualiza la transacción según el modo
      let transaccion;
      if (modoEdicion && transaccionIdEditar) {
        // Modo edición
        transaccion = await updateTransaction(parseInt(transaccionIdEditar), datosTransaccion);
        toast.success('Transacción actualizada exitosamente');
      } else {
        // Modo creación
        transaccion = await createTransaction(datosTransaccion);
        toast.success('El gasto se registró exitosamente');
      }

      // Se adjuntan y vinculan las evidencias (solo en modo creación o si hay nuevas evidencias)
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
            toast.warning(`Ocurrió un error al subir la evidencia ${evidencia.name}`);
          }
        }
      }

      // Redirigir según el modo
      if (modoEdicion) {
        navigate(`/proyecto/${formData.proyecto}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      // Mejorar el mensaje de error mostrando detalles específicos
      let errorMessage = 'Ha ocurrido un error al registrar el gasto';
      
      if (error.response?.data) {
        // Si hay errores de validación del backend, mostrarlos
        const backendErrors = error.response.data;
        if (backendErrors.error) {
          errorMessage = backendErrors.error;
        } else if (typeof backendErrors === 'object') {
          // Si hay múltiples errores de validación
          const errorList = Object.entries(backendErrors)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${messages}`;
            })
            .join('; ');
          errorMessage = errorList || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Error completo:', error);
      if (error.response) {
        console.error('Datos de respuesta del error:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (cargandoTransaccion) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando transacción...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="card-title text-center mb-4">
                {modoEdicion ? 'Editar transacción' : 'Registrar nuevo gasto'}
              </h1>

              <form onSubmit={handleSubmit}>
                {/* Selección de proyecto */}
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
                    disabled={modoEdicion}
                  >
                    <option value="">Seleccione un proyecto...</option>
                    {Array.isArray(proyectos) && proyectos.map(proyecto => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre_proyecto}
                      </option>
                    ))}
                  </select>
                  {errors.proyecto && <div className="invalid-feedback">{errors.proyecto}</div>}
                </div>

                {/* Selección o creación de proveedor */}
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
                      Crear un nuevo proveedor
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
                      <option value="">Seleccione un proveedor...</option>
                      {Array.isArray(proveedores) && proveedores.map(proveedor => (
                        <option key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre_proveedor} ({proveedor.rut_proveedor})
                        </option>
                      ))}
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
                          placeholder="Correo electrónico"
                          value={formData.nuevo_proveedor_email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Monto y fecha del gasto */}
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
                      Fecha del gasto <span className="text-danger">*</span>
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

                {/* Información del documento */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="nro_documento" className="form-label">
                      Número de documento <span className="text-danger">*</span>
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
                      Tipo de documento <span className="text-danger">*</span>
                    </label>
                    <select
                      id="tipo_doc_transaccion"
                      name="tipo_doc_transaccion"
                      className="form-select"
                      value={formData.tipo_doc_transaccion}
                      onChange={handleChange}
                      required
                    >
                      <option value="factura electrónica">Factura electrónica</option>
                      <option value="factura exenta">Factura exenta</option>
                      <option value="boleta de compra">Boleta de compra</option>
                      <option value="boleta de honorarios">Boleta de honorarios</option>
                    </select>
                  </div>
                </div>

                {/* Ítems presupuestarios */}
                {formData.tipo_transaccion === 'egreso' && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="item_presupuestario" className="form-label">
                          Ítem presupuestario <span className="text-danger">*</span>
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
                          <option value="">Seleccione un ítem...</option>
                          {Array.isArray(itemsPresupuestarios) && itemsPresupuestarios.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.nombre_item_presupuesto}
                              {` (Saldo: $${item.saldo_disponible?.toLocaleString('es-CL') || 'N/A'})`}
                            </option>
                          ))}
                        </select>
                        {errors.item_presupuestario && (
                          <div className="invalid-feedback">{errors.item_presupuestario}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="subitem_presupuestario" className="form-label">
                          Subítem presupuestario (opcional)
                        </label>
                        <select
                          id="subitem_presupuestario"
                          name="subitem_presupuestario"
                          className="form-select"
                          value={formData.subitem_presupuestario}
                          onChange={handleChange}
                          disabled={!formData.item_presupuestario}
                        >
                          <option value="">Seleccione un subítem...</option>
                          {Array.isArray(subitemsPresupuestarios) && subitemsPresupuestarios.map(subitem => (
                            <option key={subitem.id} value={subitem.id}>
                              {subitem.nombre_subitem_presupuesto}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="categoria_gasto" className="form-label">
                        Categoría del gasto
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="categoria_gasto"
                        name="categoria_gasto"
                        value={formData.categoria_gasto}
                        onChange={handleChange}
                        placeholder="Ejemplo: materiales, servicios, etc."
                      />
                    </div>
                  </>
                )}

                {/* Conciliación bancaria (para ingresos) */}
                {formData.tipo_transaccion === 'ingreso' && (
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="numero_cuenta_bancaria" className="form-label">
                        Número de cuenta bancaria
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
                        Número de operación bancaria
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

                {/* Carga de evidencias */}
                <div className="mb-3">
                  <label htmlFor="evidencias" className="form-label">
                    Documentos de respaldo <span className="text-danger">*</span>
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

                {/* Botones de acción */}
                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (modoEdicion && formData.proyecto) {
                        navigate(`/proyecto/${formData.proyecto}`);
                      } else {
                        navigate('/');
                      }
                    }}
                    disabled={loading || cargandoTransaccion}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || cargandoTransaccion}
                  >
                    {loading 
                      ? (modoEdicion ? 'Actualizando...' : 'Guardando...') 
                      : (modoEdicion ? 'Actualizar transacción' : 'Guardar gasto')
                    }
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
