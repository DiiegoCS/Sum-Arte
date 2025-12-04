import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
// Purple Admin Template Styles
import './assets/vendors/mdi/css/materialdesignicons.min.css';
import './assets/vendors/ti-icons/css/themify-icons.css';
import './assets/vendors/css/vendor.bundle.base.css';
import './assets/vendors/font-awesome/css/font-awesome.min.css';
import './assets/css/purple-admin.css';
// Custom App Styles
import './App.css';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import RegisterExpense from './pages/RegisterExpense';
import PreRendicion from './pages/PreRendicion';
import CerrarRendicion from './pages/CerrarRendicion';
import Login from './pages/Login';
import CreateOrganization from './pages/CreateOrganization';
import InviteUser from './pages/InviteUser';
import AcceptInvitation from './pages/AcceptInvitation';
import ProjectTeam from './pages/ProjectTeam';
import CreateEditProject from './pages/CreateEditProject';
import UserProfile from './pages/UserProfile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/aceptar-invitacion" element={<AcceptInvitation />} />
            
            {/* Ruta para crear organización (requiere autenticación) */}
            <Route
              path="/crear-organizacion"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateOrganization />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invitar-usuario"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InviteUser />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id/equipo"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectTeam />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/crear-proyecto"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateEditProject />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id/editar"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateEditProject />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-perfil"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* La aplicación encapsula las rutas protegidas que requieren autenticación */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/registrar-gasto"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RegisterExpense />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id/pre-rendicion"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PreRendicion />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id/cerrar-rendicion"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CerrarRendicion />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Si la ruta no existe, la aplicación redirige al usuario al inicio */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;