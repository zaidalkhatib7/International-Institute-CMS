import AppThemeProvider from './app/providers/AppThemeProvider'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <AppThemeProvider>
      <AppRouter />
    </AppThemeProvider>
  )
}
