import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import './App.css';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import RegisterExpense from './pages/RegisterExpense';
import PreRendicion from './pages/PreRendicion';
import CerrarRendicion from './pages/CerrarRendicion';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            {/* Ruta pública de inicio de sesión */}
            <Route path="/login" element={<Login />} />
            
            {/* La aplicación encapsula las rutas protegidas que requieren autenticación */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <Dashboard />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <ProjectDetails />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/registrar-gasto"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <RegisterExpense />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id/pre-rendicion"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <PreRendicion />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/proyecto/:id/cerrar-rendicion"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <CerrarRendicion />
                  </>
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