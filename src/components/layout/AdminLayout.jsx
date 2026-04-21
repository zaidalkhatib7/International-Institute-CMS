import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar'; // Assuming this is your sidebar component

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}