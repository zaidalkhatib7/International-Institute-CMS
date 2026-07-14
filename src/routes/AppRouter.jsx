import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import WorkspaceOverviewPage from '../features/dashboard/pages/WorkspaceOverviewPage'
import UsersPage from '../features/users/pages/UsersPage'
import UserWalletActionPage from '../features/users/pages/UserWalletActionPage'
import ProgramsPage from '../features/programs/pages/ProgramsPage'
import ProgramBuilderPage from '../features/programs/pages/ProgramBuilderPage'
import CategoriesPage from '../features/categories/pages/CategoriesPage'
import LessonsPage from '../features/lessons/pages/LessonsPage'
import LessonBuilderPage from '../features/lessons/pages/LessonBuilderPage'
import SectionsPage from '../features/sections/pages/SectionsPage'
import SectionBuilderPage from '../features/sections/pages/SectionBuilderPage'
import QuizzesPage from '../features/quizzes/pages/QuizzesPage'
import QuizBuilderPage from '../features/quizzes/pages/QuizBuilderPage'
import AiQuizSettingsPage from '../features/quizzes/pages/AiQuizSettingsPage'
import SettingsPage from '../features/settings/pages/SettingsPage'
import ApiModulePage from '../features/platform/pages/ApiModulePage'
import PublicSiteArchitecturePage from '../features/content/pages/PublicSiteArchitecturePage'
import NotFoundPage from '../features/shared/pages/NotFoundPage'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import LoginPage from '../features/auth/pages/LoginPage'

function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}

const moduleWorkspacePaths = [
  '/content/pages',
  '/content/news',
  '/content/experts',
  '/rpl/applications',
  '/rpl/evidence',
  '/rpl/assessments',
  '/rpl/accreditation',
  '/rpl/appeals',
  '/standards',
  '/assessors',
  '/committees',
  '/quality',
  '/finance',
  '/reports',
  '/notifications',
]

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
              <WorkspaceOverviewPage />
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
          path="/users/wallet"
          element={
            <AdminRoute>
              <UserWalletActionPage />
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
          path="/ai-settings"
          element={
            <AdminRoute>
              <AiQuizSettingsPage />
            </AdminRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />

        <Route
          path="/content/architecture"
          element={
            <AdminRoute>
              <PublicSiteArchitecturePage />
            </AdminRoute>
          }
        />

        {moduleWorkspacePaths.map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <AdminRoute>
                <ApiModulePage />
              </AdminRoute>
            }
          />
        ))}

        <Route
          path="*"
          element={
            <AdminRoute>
              <NotFoundPage />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
