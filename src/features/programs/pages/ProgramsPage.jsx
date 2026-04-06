import { Badge, Button, DataTableShell, PageHeader } from '../../../components/ui'

const rows = [
  {
    id: 1,
    program: 'Strategic Leadership Short Course',
    category: 'Business',
    duration: '12 Weeks',
    price: '1,850 II Points',
    visibility: 'Featured',
    status: 'Active',
  },
  {
    id: 2,
    program: 'Executive Management Program',
    category: 'Management',
    duration: '24 Months',
    price: '12,400 II Points',
    visibility: 'Standard',
    status: 'Active',
  },
  {
    id: 3,
    program: 'Professional Diploma in Humanitarian Action',
    category: 'Sociology',
    duration: '1 Year',
    price: '4,200 II Points',
    visibility: 'Featured',
    status: 'Inactive',
  },
]

const columns = [
  { 
    key: 'program', 
    label: 'Program',
    render: (row) => (
      <span className="font-semibold text-[var(--color-text)]">{row.program}</span>
    )
  },
  { key: 'category', label: 'Category' },
  { key: 'duration', label: 'Duration' },
  { 
    key: 'price', 
    label: 'Price',
    render: (row) => (
      <span className="font-mono font-medium text-[var(--color-primary)]">{row.price}</span>
    )
  },
  {
    key: 'visibility',
    label: 'Visibility',
    render: (row) => (
      <Badge variant={row.visibility === 'Featured' ? 'secondary' : 'neutral'}>
        {row.visibility}
      </Badge>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'neutral'}>
        {row.status}
      </Badge>
    ),
  },
]

export default function ProgramsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs"
        description="Manage academic programs, pricing, visibility, and publication status."
        actions={
          <>
            <Button variant="outline">View Categories</Button>
            <Button>+ New Program</Button>
          </>
        }
      />

      <DataTableShell
        title="Programs Archive"
        description="Reusable listing table for programs."
        columns={columns}
        rows={rows}
      />
    </div>
  )
}
