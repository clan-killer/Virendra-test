// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MerchantRegistration from './pages/MerchantRegistration';
import AddCustomer from './pages/AddCustomer';
import AddTransaction from './pages/AddTransaction';
import Transactions from './pages/Transactions';

export default function App() {
  return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register-merchant"
        element={
          <ProtectedRoute>
            <MerchantRegistration />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/new"
        element={
          <ProtectedRoute>
            <AddCustomer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/new"
        element={
          <ProtectedRoute>
            <AddTransaction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />

      {/* Safer during debugging: unknown paths go to /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
  );
}