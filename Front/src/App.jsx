import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import './App.css';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import RegisterExpense from './pages/RegisterExpense';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
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
            
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;