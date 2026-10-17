import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, Minus, Plus, TriangleAlert } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, MoneyInput, PageHeader, Select, Textarea } from '../../../components/ui'
import Money from '../../../components/Money'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { newIdempotencyKey } from '../../../utils/idempotency'
import { formatMoneyInline, money } from '../../../utils/money'
import { todayIso } from '../../rpl/domain/afterQuiz'
import {
  TOP_UP_METHODS,
  WALLET_LIMITS,
  balanceWords,
  fillWallet,
  isImplausibleAmount,
  isWalletFormValid,
  movementMinor,
  walletBalances,
  walletCopy,
  walletFormErrors,
  walletPayload,
  walletRefusal,
} from '../domain/wallet'
import { deductUserWallet, fetchUser, topUpUserWallet } from '../services/usersService'

/*
 * TOP UP OR DEDUCT A CLIENT'S BALANCE (owner decisions of 17 Oct 2026; contract
 * S3, S4). /users/:id/wallet?action=top-up|deduct: the page loads the client by
 * id, so no name ever travels in the URL.
 *
 * The balance has NO default: staff choose US dollars or Syrian pounds, and the
 * amount field follows (cents for dollars only). A top-up records how the money
 * arrived, a reference unless it was cash, and the day it was received; a
 * deduction needs a reason. Nothing is sent before a confirm step that names the
 * balance in words, with a warning when the amount looks like the other currency
 * (125000 typed into dollars). One Idempotency-Key is made when the form opens
 * and sent again on a retry of the same body, so a double click or a lost answer
 * never moves money twice.
 */

function emptyForm() {
  return { currency: '', amount: '', method: '', reference: '', received_on: '', notes: '', reason: '' }
}

export default function UserWalletActionPage() {
  const language = getAdminLanguage() === 'ar' ? 'ar' : 'en'
  const copy = walletCopy(language)
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const action = searchParams.get('action') === 'deduct' ? 'deduct' : 'top-up'
  const isDeduct = action === 'deduct'
  const [state, setState] = useState({ loading: true, error: '', user: null })
  const [form, setForm] = useState(emptyForm)
  const [step, setStep] = useState('form')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ error: '', success: '' })
  const keyRef = useRef({ key: '', body: null })

  useEffect(() => {
    // One key per opened form; a retry of the same body reuses it.
    keyRef.current = { key: newIdempotencyKey(), body: null }
  }, [action, id])

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const user = unwrapApiData(await fetchUser(id))
      setState({ loading: false, error: '', user: user && typeof user === 'object' ? user : null })
    } catch (error) {
      setState({ loading: false, error: readApiError(error, copy.loadFailed, language), user: null })
    }
  }, [copy.loadFailed, id, language])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const today = todayIso()
  const errors = walletFormErrors(isDeduct ? 'deduct' : 'top-up', form, today)
  const valid = isWalletFormValid(isDeduct ? 'deduct' : 'top-up', form, today)
  const minor = movementMinor(form)
  const typed = (field) => String(form[field] ?? '').trim() !== ''
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const user = state.user
  const balances = walletBalances(user)
  const name = user?.name || (id ? `ICPC-${id}` : '—')

  function changeCurrency(currency) {
    setForm((current) => ({ ...current, currency, amount: '' }))
    setStep('form')
  }

  async function submit() {
    if (!valid || busy) return
    const body = walletPayload(isDeduct ? 'deduct' : 'top-up', form)
    const serialized = JSON.stringify(body)
    // A different body is a different act: it gets its own key. The same body (a retry) keeps the key it was sent with.
    if (!keyRef.current.key || (keyRef.current.body !== null && keyRef.current.body !== serialized)) keyRef.current = { key: newIdempotencyKey(), body: null }
    keyRef.current.body = serialized
    setBusy(true)
    setNotice({ error: '', success: '' })
    try {
      const response = unwrapApiData(isDeduct ? await deductUserWallet(id, body, keyRef.current.key) : await topUpUserWallet(id, body, keyRef.current.key))
      const nextBalances = response?.balances
      const currencyKey = form.currency === 'SYP' ? 'syp' : 'usd'
      const after = nextBalances?.[currencyKey]
      setState((current) => ({ ...current, user: current.user ? { ...current.user, wallet_balances: { ...walletBalances(current.user), ...(nextBalances || {}) } } : current.user }))
      setNotice({
        error: '',
        success: fillWallet(isDeduct ? copy.deducted : copy.toppedUp, {
          amount: formatMoneyInline(money(minor, form.currency), language),
          balance: balanceWords(form.currency, language),
          new: formatMoneyInline(after || balances[currencyKey], language),
        }),
      })
      setForm(emptyForm())
      setStep('form')
      keyRef.current = { key: newIdempotencyKey(), body: null }
    } catch (error) {
      setNotice({ error: walletRefusal(error, language) || readApiError(error, copy.failed, language), success: '' })
    } finally {
      setBusy(false)
    }
  }

  function renderCurrencyChoice() {
    return (
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-[var(--color-text)]">{copy.currency}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[['USD', copy.currencyUsd, balances.usd], ['SYP', copy.currencySyp, balances.syp]].map(([currency, label, balance]) => (
            <label key={currency} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 ${form.currency === currency ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft,#e7f5fb)]' : 'border-[var(--color-border)]'}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="wallet-currency" aria-label={label} value={currency} checked={form.currency === currency} onChange={() => changeCurrency(currency)} />
                <span className="font-semibold">{label}</span>
              </span>
              <Money value={balance} language={language} className="text-sm text-[var(--color-text-muted)]" />
            </label>
          ))}
        </div>
        {!form.currency ? <p className="text-xs text-[var(--color-text-muted)]">{copy.currencyRequired}</p> : null}
      </fieldset>
    )
  }

  function renderFields() {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <MoneyInput
          id="wallet-amount"
          currency={form.currency}
          language={language}
          label={copy.amount}
          value={form.amount}
          disabled={!form.currency}
          error={typed('amount') && errors.amount ? (form.currency === 'SYP' ? copy.sypInvalid : copy.usdInvalid) : undefined}
          onChange={(value) => setForm((current) => ({ ...current, amount: value }))}
        />
        {isDeduct ? (
          <Textarea id="wallet-reason" rows={3} label={copy.reason} value={form.reason} maxLength={WALLET_LIMITS.reasonMax} error={typed('reason') && errors.reason ? copy.reasonInvalid : undefined} onChange={set('reason')} />
        ) : (
          <>
            <Select id="wallet-method" label={copy.method} value={form.method} onChange={set('method')}>
              <option value="" disabled>—</option>
              {TOP_UP_METHODS.map((method) => <option key={method} value={method}>{copy.methods[method]}</option>)}
            </Select>
            <Input id="wallet-reference" label={copy.reference} value={form.reference} maxLength={WALLET_LIMITS.referenceMax} error={typed('reference') && errors.reference ? copy.referenceInvalid : undefined} onChange={set('reference')} />
            <Input id="wallet-received-on" type="date" max={today} label={copy.receivedOn} value={form.received_on} error={typed('received_on') && errors.received_on ? copy.receivedOnInvalid : undefined} onChange={set('received_on')} />
            <Textarea id="wallet-notes" rows={2} label={copy.notes} value={form.notes} maxLength={WALLET_LIMITS.notesMax} error={errors.notes && (typed('notes') || form.method === 'other') ? copy.notesInvalid : undefined} onChange={set('notes')} />
          </>
        )}
      </div>
    )
  }

  function renderConfirm() {
    const amount = formatMoneyInline(money(minor, form.currency), language)
    const sentence = fillWallet(isDeduct ? copy.confirmDeduct : copy.confirmTopUp, { amount, balance: balanceWords(form.currency, language), name })
    return (
      <section aria-label={isDeduct ? copy.deductTitle : copy.topUpTitle} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
        <p className="text-base font-semibold"><bdi>{sentence}</bdi></p>
        {isImplausibleAmount(form.currency, minor) ? (
          <p role="note" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <TriangleAlert size={16} className="mt-1 shrink-0" aria-hidden="true" /><bdi>{fillWallet(copy.checkCurrency, { amount })}</bdi>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={busy || !valid} variant={isDeduct ? 'danger' : 'primary'}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : isDeduct ? <Minus size={16} /> : <Plus size={16} />}
            {busy ? copy.processing : copy.confirm}
          </Button>
          <Button variant="outline" onClick={() => setStep('form')} disabled={busy}>{copy.back}</Button>
        </div>
      </section>
    )
  }

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-8">
      <PageHeader title={isDeduct ? copy.deductTitle : copy.topUpTitle} description={fillWallet(copy.client, { name })} />

      {notice.error ? <div role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{notice.error}</div> : null}
      {notice.success ? <div role="status" className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700"><bdi>{notice.success}</bdi></div> : null}

      <Card>
        <CardContent className="space-y-6 p-6">
          {state.loading ? <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} /></p> : null}
          {!state.loading && state.error ? <p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{state.error}</p> : null}
          {!state.loading && user ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-border)] p-4"><p className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.usdBalance}</p><p className="mt-1 text-2xl font-bold"><Money value={balances.usd} language={language} /></p></div>
                <div className="rounded-2xl border border-[var(--color-border)] p-4"><p className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.sypBalance}</p><p className="mt-1 text-2xl font-bold"><Money value={balances.syp} language={language} /></p></div>
              </div>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">{isDeduct ? copy.deductHint : copy.topUpHint}</p>
              {renderCurrencyChoice()}
              {renderFields()}
              {step === 'confirm' && valid ? renderConfirm() : (
                <div className="flex justify-end">
                  <Button onClick={() => setStep('confirm')} disabled={!valid || busy}>{copy.continue}</Button>
                </div>
              )}
            </>
          ) : null}
          <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-4">
            <Button variant="outline" onClick={() => navigate(`/users/${id}`)} disabled={busy}><BackIcon size={16} />{copy.backToClient}</Button>
            <Button variant="ghost" onClick={() => navigate('/users')} disabled={busy}>{copy.backToUsers}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
