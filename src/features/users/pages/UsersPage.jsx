import { Badge, DataTableShell, PageHeader } from '../../../components/ui'

const rows = [
  {
    id: 1,
    name: 'Jan de Slutter',
    email: 'j.deslutter@iis.nl',
    role: 'Admin',
    registrationDate: 'Oct 12, 2023',
    wallet: '1,240 II Points',
  },
  {
    id: 2,
    name: 'Maud van den Berg',
    email: 'm.vandenberg@iis.nl',
    role: 'Trainer',
    registrationDate: 'Nov 05, 2023',
    wallet: '8,450 II Points',
  },
  {
    id: 3,
    name: 'Pieter Haaksman',
    email: 'p.haaksman@student.iis.nl',
    role: 'Student',
    registrationDate: 'Jan 14, 2024',
    wallet: '420 II Points',
  },
]

const columns = [
  { 
    key: 'name', 
    label: 'Name & Identity',
    render: (row) => (
      <span className="font-semibold text-[var(--color-text)]">{row.name}</span>
    )
  },
  { key: 'email', label: 'Institutional Email' },
  {
    key: 'role',
    label: 'Role',
    render: (row) => {
      const variantMap = {
        Admin: 'success',
        Trainer: 'info',
        Student: 'warning',
        User: 'neutral',
      }

      return <Badge variant={variantMap[row.role] || 'neutral'}>{row.role}</Badge>
    },
  },
  { key: 'registrationDate', label: 'Registration Date' },
  { 
    key: 'wallet', 
    label: 'Wallet Balance',
    render: (row) => (
      <span className="font-mono font-medium text-[var(--color-primary)]">{row.wallet}</span>
    )
  },
]

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Review institutional accounts, wallet balances, and role assignments."
      />

      <DataTableShell
        title="All Users"
        description="Showing recent user records in a reusable table shell."
        columns={columns}
        rows={rows}
      />
    </div>
  )
}
