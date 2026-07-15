import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import AuthorizedRoute from '../components/layout/AuthorizedRoute'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import AuthorizationProvider from '../features/auth/context/AuthorizationProvider'
import { getRouteAccess } from './routeAccess'

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
const RplApplicationsPage = lazy(() => import('../features/rpl/pages/RplApplicationsPage'))
const RplCaseWorkspacePage = lazy(() => import('../features/rpl/pages/RplCaseWorkspacePage'))
const RplEvidencePage = lazy(() => import('../features/rpl/pages/RplEvidencePage'))
const RplAssessmentsPage = lazy(() => import('../features/rpl/pages/RplAssessmentsPage'))
const RplGovernancePage = lazy(() => import('../features/rpl/pages/RplGovernancePage'))
const RplAssessorsPage = lazy(() => import('../features/rpl/pages/RplAssessorsPage'))
const RplConfigurationPage = lazy(() => import('../features/rpl/pages/RplConfigurationPage'))
const CertificatesPage = lazy(() => import('../features/certificates/pages/CertificatesPage'))
const DigitalLibraryPage = lazy(() => import('../features/library/pages/DigitalLibraryPage'))
const SupportOperationsPage = lazy(() => import('../features/support/pages/SupportOperationsPage'))
const FinanceOperationsPage = lazy(() => import('../features/finance/pages/FinanceOperationsPage'))
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
  const location = useLocation()

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AuthorizedRoute access={getRouteAccess(location.pathname)}>
          <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
        </AuthorizedRoute>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

const moduleWorkspacePaths = [
  '/content/pages',
  '/content/news',
  '/content/experts',
  '/reports',
  '/notifications',
]

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthorizationProvider>
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

        <Route path="/rpl/applications" element={<AdminRoute><RplApplicationsPage /></AdminRoute>} />
        <Route path="/rpl/applications/:applicationId" element={<AdminRoute><RplCaseWorkspacePage /></AdminRoute>} />
        <Route path="/rpl/evidence" element={<AdminRoute><RplEvidencePage /></AdminRoute>} />
        <Route path="/rpl/assessments" element={<AdminRoute><RplAssessmentsPage /></AdminRoute>} />
        <Route path="/rpl/assessments/:assessmentId" element={<AdminRoute><RplAssessmentsPage /></AdminRoute>} />
        <Route path="/rpl/accreditation" element={<AdminRoute><RplGovernancePage mode="committee" /></AdminRoute>} />
        <Route path="/rpl/appeals" element={<AdminRoute><RplGovernancePage mode="appeals" /></AdminRoute>} />
        <Route path="/rpl/configuration" element={<AdminRoute><RplConfigurationPage /></AdminRoute>} />
        <Route path="/standards" element={<AdminRoute><RplConfigurationPage /></AdminRoute>} />
        <Route path="/assessors" element={<AdminRoute><RplAssessorsPage /></AdminRoute>} />
        <Route path="/committees" element={<AdminRoute><RplGovernancePage mode="committee" /></AdminRoute>} />
        <Route path="/quality" element={<AdminRoute><RplGovernancePage mode="quality" /></AdminRoute>} />
        <Route path="/certificates" element={<AdminRoute><CertificatesPage /></AdminRoute>} />
        <Route path="/library" element={<AdminRoute><DigitalLibraryPage /></AdminRoute>} />
        <Route path="/support" element={<AdminRoute><SupportOperationsPage /></AdminRoute>} />
        <Route path="/finance" element={<AdminRoute><FinanceOperationsPage /></AdminRoute>} />

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
      </AuthorizationProvider>
    </BrowserRouter>
  )
}
