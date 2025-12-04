/**
 * Página de inicio de sesión para Sum-Arte.
 * 
 * Gestiona la autenticación del usuario con tokens JWT.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente Login.
 */
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Si el usuario ya está autenticado, se redirige a la página de inicio
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success('Inicio de sesión exitoso');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-scroller">
      <div className="container-fluid page-body-wrapper full-page-wrapper">
        <div className="content-wrapper d-flex align-items-center auth px-0">
          <div className="row w-100 mx-0">
            <div className="col-lg-4 mx-auto">
              <div className="auth-form-light text-left py-5 px-4 px-sm-5">
                <div className="brand-logo text-center mb-4">
                  <h2 className="text-primary">
                    <i className="mdi mdi-palette me-2"></i>
                    Sum-Arte
                  </h2>
                </div>
                <h4 className="text-center mb-4">Iniciar Sesión</h4>
                
                <form className="pt-3" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="username" className="form-label">
                      <i className="mdi mdi-account me-1"></i>
                      Usuario
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="username"
                      placeholder="Ingrese su usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      <i className="mdi mdi-lock me-1"></i>
                      Contraseña
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      id="password"
                      placeholder="Ingrese su contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="mt-3">
                    <button
                      type="submit"
                      className="btn btn-block btn-gradient-primary btn-lg font-weight-medium auth-form-btn"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Iniciando sesión...
                        </>
                      ) : (
                        <>
                          <i className="mdi mdi-login me-2"></i>
                          Iniciar Sesión
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Login;


