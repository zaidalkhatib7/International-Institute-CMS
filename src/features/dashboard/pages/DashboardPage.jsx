import {
  BookOpenCheck,
  GraduationCap,
  Star,
  Users,
} from 'lucide-react'
import { Button, Card, CardContent, StatCard } from '../../../components/ui'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Hero Welcome Section */}
      <section
        className="rounded-[32px] px-8 py-8 text-white shadow-[var(--shadow-card)]"
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, #153f68 100%)',
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Welcome back, Dr. Arjan</h1>
            <p className="mt-2 text-white/70">
              Here is a quick overview of your institution’s growth today.
            </p>
          </div>

          <Button variant="secondary">+ Create Program</Button>
        </div>
      </section>

      {/* Stats Overview Grid */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value="12,482"
          hint="+8.4% this month"
          icon={<Users size={22} />}
        />
        <StatCard
          title="Total Enrollments"
          value="4,912"
          hint="+12.1% this month"
          icon={<BookOpenCheck size={22} />}
        />
        <StatCard
          title="Active Programs"
          value="84"
          hint="4 new this week"
          icon={<GraduationCap size={22} />}
        />
        <StatCard
          title="Featured Programs"
          value="12"
          hint="Curated highlights"
          icon={<Star size={22} />}
        />
      </section>

      {/* Main Content Grid */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold text-[var(--color-text)]">
              Recent Enrollments
            </h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Table UI comes in the next step.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold text-[var(--color-text)]">
              Recently Updated
            </h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Feed cards come in the next step.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
