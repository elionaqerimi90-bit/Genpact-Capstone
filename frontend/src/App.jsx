import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminRoute, ManagerRoute, ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FloorPlan from './pages/FloorPlan';
import Reservations from './pages/Reservations';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReservations from './pages/admin/Reservations';
import Resources from './pages/admin/Resources';
import FloorBuilder from './pages/admin/FloorBuilder';
import Analytics from './pages/admin/Analytics';
import Users from './pages/admin/Users';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="floor-plan" element={<FloorPlan />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="admin/reservations"
              element={
                <AdminRoute>
                  <AdminReservations />
                </AdminRoute>
              }
            />
            <Route
              path="admin/resources"
              element={
                <AdminRoute>
                  <Resources />
                </AdminRoute>
              }
            />
            <Route
              path="admin/builder"
              element={
                <AdminRoute>
                  <FloorBuilder />
                </AdminRoute>
              }
            />
            <Route
              path="admin/analytics"
              element={
                <ManagerRoute>
                  <Analytics />
                </ManagerRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <Users />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
