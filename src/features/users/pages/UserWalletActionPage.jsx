import { useMemo, useState } from 'react'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, PageHeader } from '../../../components/ui'
import { getCurrentLanguage } from '../../../utils/localization'
import { creditUserWallet, debitUserWallet } from '../services/usersService'

function getCopy(language) {
  if (language === 'ar') {
    return {
      creditTitle: 'إضافة نقاط المحفظة',
      debitTitle: 'خصم نقاط المحفظة',
      subtitlePrefix: 'المستخدم',
      amount: 'المبلغ',
      description: 'الوصف',
      creditPlaceholder: 'سبب الإضافة (اختياري)',
      debitPlaceholder: 'سبب الخصم (اختياري)',
      addPoints: 'إضافة نقاط',
      decreasePoints: 'خصم نقاط',
      processing: 'جارٍ التنفيذ...',
      backToUsers: 'العودة إلى المستخدمين',
      invalidAmount: 'أدخل مبلغًا أكبر من 0.',
      missingUser: 'لا يمكن تنفيذ العملية: لم يتم تحديد مستخدم.',
      creditSuccess: 'تمت إضافة النقاط بنجاح.',
      debitSuccess: 'تم خصم النقاط بنجاح.',
      creditFailed: 'فشل إضافة النقاط.',
      debitFailed: 'فشل خصم النقاط.',
    }
  }

  if (language === 'nl') {
    return {
      creditTitle: 'Walletpunten toevoegen',
      debitTitle: 'Walletpunten verlagen',
      subtitlePrefix: 'Gebruiker',
      amount: 'Bedrag',
      description: 'Beschrijving',
      creditPlaceholder: 'Reden voor bijschrijving (optioneel)',
      debitPlaceholder: 'Reden voor afschrijving (optioneel)',
      addPoints: 'Punten toevoegen',
      decreasePoints: 'Punten verlagen',
      processing: 'Verwerken...',
      backToUsers: 'Terug naar gebruikers',
      invalidAmount: 'Voer een bedrag groter dan 0 in.',
      missingUser: 'Kan niet opslaan: geen gebruiker geselecteerd.',
      creditSuccess: 'Punten succesvol toegevoegd.',
      debitSuccess: 'Punten succesvol verlaagd.',
      creditFailed: 'Punten toevoegen mislukt.',
      debitFailed: 'Punten verlagen mislukt.',
    }
  }

  return {
    creditTitle: 'Add Wallet Points',
    debitTitle: 'Decrease Wallet Points',
    subtitlePrefix: 'User',
    amount: 'Amount',
    description: 'Description',
    creditPlaceholder: 'Reason for credit (optional)',
    debitPlaceholder: 'Reason for debit (optional)',
    addPoints: 'Add Points',
    decreasePoints: 'Decrease Points',
    processing: 'Processing...',
    backToUsers: 'Back to Users',
    invalidAmount: 'Enter an amount greater than 0.',
    missingUser: 'Cannot save: no user selected.',
    creditSuccess: 'Points credited successfully.',
    debitSuccess: 'Points debited successfully.',
    creditFailed: 'Failed to credit points.',
    debitFailed: 'Failed to debit points.',
  }
}

export default function UserWalletActionPage() {
  const language = getCurrentLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const copy = useMemo(() => getCopy(language), [language])

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const action = searchParams.get('action') === 'debit' ? 'debit' : 'credit'
  const userId = Number(searchParams.get('userId'))
  const userName = searchParams.get('name') || (Number.isFinite(userId) ? `IIS-${userId}` : '-')
  const isDebit = action === 'debit'

  const handleSubmit = async () => {
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError(copy.invalidAmount)
      return
    }

    if (!userId || Number.isNaN(userId)) {
      setError(copy.missingUser)
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const payload = {
        amount: numericAmount,
        description: description || undefined,
      }

      if (isDebit) {
        await debitUserWallet(userId, payload)
      } else {
        await creditUserWallet(userId, payload)
      }

      navigate('/users', {
        replace: true,
        state: {
          walletActionMessage: isDebit ? copy.debitSuccess : copy.creditSuccess,
        },
      })
    } catch (requestError) {
      const fallbackMessage = isDebit ? copy.debitFailed : copy.creditFailed
      const message = String(
        requestError?.response?.data?.message || requestError?.message || fallbackMessage
      )
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isDebit ? copy.debitTitle : copy.creditTitle}
        description={`${copy.subtitlePrefix}: ${userName}`}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                isDebit
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isDebit ? copy.decreasePoints : copy.addPoints}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <Input
              label={copy.amount}
              type="number"
              min="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Input
              label={copy.description}
              placeholder={isDebit ? copy.debitPlaceholder : copy.creditPlaceholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={
                isDebit
                  ? 'rounded-full bg-rose-600 px-6 text-white shadow-[0_6px_16px_rgba(225,29,72,0.25)] hover:bg-rose-700'
                  : 'rounded-full bg-emerald-600 px-6 text-white shadow-[0_6px_16px_rgba(16,185,129,0.25)] hover:bg-emerald-700'
              }
            >
              {isDebit ? <Minus size={16} /> : <Plus size={16} />}
              {isSubmitting
                ? copy.processing
                : isDebit
                  ? copy.decreasePoints
                  : copy.addPoints}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/users')}
              disabled={isSubmitting}
              className="rounded-full px-6"
            >
              <ArrowLeft size={16} />
              {copy.backToUsers}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
