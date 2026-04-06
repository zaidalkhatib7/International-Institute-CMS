import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import LoginPage from '../features/auth/pages/LoginPage'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import UsersPage from '../features/users/pages/UsersPage'
import ProgramsPage from '../features/programs/pages/ProgramsPage'
import PlaceholderPage from '../features/shared/pages/PlaceholderPage'
import NotFoundPage from '../features/shared/pages/NotFoundPage'

function AdminRoute({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>
}

function AuthRoute({ children }) {
  return <AuthLayout>{children}</AuthLayout>
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          }
        />

        <Route
          path="/users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />

        <Route
          path="/programs"
          element={
            <AdminRoute>
              <ProgramsPage />
            </AdminRoute>
          }
        />

        <Route
          path="/enrollments"
          element={
            <AdminRoute>
              <PlaceholderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <AdminRoute>
              <PlaceholderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/sections"
          element={
            <AdminRoute>
              <PlaceholderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/lessons"
          element={
            <AdminRoute>
              <PlaceholderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/quizzes"
          element={
            <AdminRoute>
              <PlaceholderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <AdminRoute>
              <PlaceholderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/support"
          element={
            <AdminRoute>
              <PlaceholderPage />
            </AdminRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}