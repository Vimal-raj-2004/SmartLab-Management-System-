import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

// Dashboards
import AdminDashboard from './pages/dashboards/AdminDashboard';
import FacultyDashboard from './pages/dashboards/FacultyDashboard';
import AssistantDashboard from './pages/dashboards/AssistantDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';

// Phase 2 Pages
import LabsPage from './pages/admin/LabsPage';
import PCsPage from './pages/admin/PCsPage';
import InventoryPage from './pages/admin/InventoryPage';
import UsersPage from './pages/admin/UsersPage';

// Phase 3 Pages (Complaints & Maintenance)
import SubmitComplaintPage from './pages/complaints/SubmitComplaintPage';
import MyComplaintsPage from './pages/complaints/MyComplaintsPage';
import ComplaintManagementPage from './pages/complaints/ComplaintManagementPage';
import MaintenanceManagementPage from './pages/maintenance/MaintenanceManagementPage';

// Phase 4 Pages (Lab Booking & Availability)
import BookingPage from './pages/bookings/BookingPage';
import MyBookingsPage from './pages/bookings/MyBookingsPage';
import BookingManagementPage from './pages/bookings/BookingManagementPage';
import TodaySchedulePage from './pages/bookings/TodaySchedulePage';
import AvailabilityPage from './pages/bookings/AvailabilityPage';
import ErrorBoundary from './components/ErrorBoundary';

// Phase 5A Pages (PC Monitoring & AI Health)
import PCHealth from './pages/PCHealth';

// Phase 5B Pages (AI Lab Utilization)
import LabUtilizationPage from './pages/utilization/LabUtilizationPage';

// Phase 6 Pages (Reports & Analytics)
import ReportsPage from './pages/reports/ReportsPage';


// Layout wrapper for authenticated pages
function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Navbar onMenuToggle={() => setMobileOpen(prev => !prev)} />
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}


export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={`/${user.role === 'lab_assistant' ? 'assistant' : user.role}/dashboard`} replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* ── Admin routes ─────────────────────────────────────────── */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><AdminDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/labs"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><LabsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pcs"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><PCsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><InventoryPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><UsersPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/complaints"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><ComplaintManagementPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/maintenance"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><MaintenanceManagementPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><BookingManagementPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/availability"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><AvailabilityPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pc-health"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><PCHealth /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/utilization"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><LabUtilizationPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><ReportsPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ── Faculty routes ───────────────────────────────────────── */}
      <Route
        path="/faculty/dashboard"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><FacultyDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/labs"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><LabsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/pcs"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><PCsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/bookings/new"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><BookingPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/bookings"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><MyBookingsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/availability"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><AvailabilityPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/complaints"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><MyComplaintsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/complaints/new"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><SubmitComplaintPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/users"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><UsersPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/pc-health"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><PCHealth /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/utilization"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <AppLayout><LabUtilizationPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ── Lab Assistant routes ─────────────────────────────────── */}
      <Route
        path="/assistant/dashboard"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><AssistantDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/pcs"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><PCsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/inventory"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><InventoryPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/schedule"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><TodaySchedulePage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/bookings"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><BookingManagementPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/availability"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><AvailabilityPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/complaints"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><ComplaintManagementPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/maintenance"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><MaintenanceManagementPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/users"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><UsersPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/pc-health"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><PCHealth /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/utilization"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><LabUtilizationPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/reports"
        element={
          <ProtectedRoute allowedRoles={['lab_assistant']}>
            <AppLayout><ReportsPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ── Student routes ───────────────────────────────────────── */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout><StudentDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/labs"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout><LabsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/availability"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout><AvailabilityPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/complaints"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout><MyComplaintsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/complaints/new"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout><SubmitComplaintPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/pc-health"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout><PCHealth /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ── Universal Profile route for all roles ────────────────── */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['admin', 'faculty', 'lab_assistant', 'student']}>
            <AppLayout><Profile /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
