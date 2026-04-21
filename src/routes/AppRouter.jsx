import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import UsersPage from '../features/users/pages/UsersPage'
import ProgramsPage from '../features/programs/pages/ProgramsPage'
import ProgramBuilderPage from '../features/programs/pages/ProgramBuilderPage'
import CategoriesPage from '../features/categories/pages/CategoriesPage'
import LessonsPage from '../features/lessons/pages/LessonsPage'
import LessonBuilderPage from '../features/lessons/pages/LessonBuilderPage'
import SectionsPage from '../features/sections/pages/SectionsPage'
import SectionBuilderPage from '../features/sections/pages/SectionBuilderPage'
import QuizzesPage from '../features/quizzes/pages/QuizzesPage'
import QuizBuilderPage from '../features/quizzes/pages/QuizBuilderPage'
import PlaceholderPage from '../features/shared/pages/PlaceholderPage'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import LoginPage from '../features/auth/pages/LoginPage'

function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <AdminRoute>
              <Navigate to="/dashboard" replace />
            </AdminRoute>
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
          path="/categories"
          element={
            <AdminRoute>
              <CategoriesPage />
            </AdminRoute>
          }
        />

        <Route
          path="/programs/edit"
          element={
            <AdminRoute>
              <ProgramBuilderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/lessons"
          element={
            <AdminRoute>
              <LessonsPage />
            </AdminRoute>
          }
        />

        <Route
          path="/lessons/edit"
          element={
            <AdminRoute>
              <LessonBuilderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/sections"
          element={
            <AdminRoute>
              <SectionsPage />
            </AdminRoute>
          }
        />

        <Route
          path="/sections/edit"
          element={
            <AdminRoute>
              <SectionBuilderPage />
            </AdminRoute>
          }
        />

        <Route
          path="/quizzes"
          element={
            <AdminRoute>
              <QuizzesPage />
            </AdminRoute>
          }
        />

        <Route
          path="/quizzes/edit"
          element={
            <AdminRoute>
              <QuizBuilderPage />
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

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
