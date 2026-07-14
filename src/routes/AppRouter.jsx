import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'

const WorkspaceOverviewPage = lazy(() => import('../features/dashboard/pages/WorkspaceOverviewPage'))
const UsersPage = lazy(() => import('../features/users/pages/UsersPage'))
const UserWalletActionPage = lazy(() => import('../features/users/pages/UserWalletActionPage'))
const ProgramsPage = lazy(() => import('../features/programs/pages/ProgramsPage'))
const ProgramBuilderPage = lazy(() => import('../features/programs/pages/ProgramBuilderPage'))
const CategoriesPage = lazy(() => import('../features/categories/pages/CategoriesPage'))
const LessonsPage = lazy(() => import('../features/lessons/pages/LessonsPage'))
const LessonBuilderPage = lazy(() => import('../features/lessons/pages/LessonBuilderPage'))
const SectionsPage = lazy(() => import('../features/sections/pages/SectionsPage'))
const SectionBuilderPage = lazy(() => import('../features/sections/pages/SectionBuilderPage'))
const QuizzesPage = lazy(() => import('../features/quizzes/pages/QuizzesPage'))
const QuizBuilderPage = lazy(() => import('../features/quizzes/pages/QuizBuilderPage'))
const AiQuizSettingsPage = lazy(() => import('../features/quizzes/pages/AiQuizSettingsPage'))
const SettingsPage = lazy(() => import('../features/settings/pages/SettingsPage'))
const ApiModulePage = lazy(() => import('../features/platform/pages/ApiModulePage'))
const PublicSiteArchitecturePage = lazy(() => import('../features/content/pages/PublicSiteArchitecturePage'))
const NotFoundPage = lazy(() => import('../features/shared/pages/NotFoundPage'))
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'))

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Loading page">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--color-primary-soft)] border-t-[var(--color-primary)]" />
    </div>
  )
}

function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
      </DashboardLayout>
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
        <Route
          path="/login"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LoginPage />
            </Suspense>
          }
        />

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
