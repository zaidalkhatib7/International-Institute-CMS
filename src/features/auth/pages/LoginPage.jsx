import { LockKeyhole } from 'lucide-react'
import { branding } from '../../../config/branding'
import { Button, Card, CardContent, Input } from '../../../components/ui'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-xl rounded-[32px] p-2">
        <CardContent className="p-8 md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-primary)]">
            <LockKeyhole size={28} color="var(--color-secondary)" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-4xl font-bold text-[var(--color-text)]">
              {branding.logo.fullText}
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              {branding.productName} CMS
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <Input 
              label="Administrator ID" 
              placeholder="Enter registration ID" 
            />

            <Input
              label="Access Token"
              type="password"
              placeholder="Enter access token"
            />

            <label className="flex items-center gap-3 text-sm text-[var(--color-text-muted)] cursor-pointer">
              <input type="checkbox" className="accent-[var(--color-primary)]" />
              Enable high-security session
            </label>

            <Button fullWidth type="submit">Authenticate Access</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
