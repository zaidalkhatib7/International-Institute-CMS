import { useState } from 'react'
import { FilePlus2, LoaderCircle } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '../../../components/ui'
import Money from '../../../components/Money'
import { readApiError } from '../../../services/apiResponse'
import { amountMinorOf, formatMoneyInline, isMoney } from '../../../utils/money'
import { localize } from '../../rpl/domain/rpl'
import { fillWallet, walletBalances, walletCopy, walletRefusal } from '../domain/wallet'
import { enrollUserByStaff } from '../services/usersService'

/*
 * STAFF-ASSISTED ENROLMENT (owner decisions of 17 Oct 2026; contract S7).
 *
 * Each programme has one price in US dollars; the admin programme list carries
 * it as a Price, with the Syrian-pound amount at today's rate while a rate is
 * set (the server computes it; the platform never does for a payment). Staff
 * choose the balance the client pays from: dollars, or pounds (not offered while
 * no rate is set), each showing the client's balance and refused when it is too
 * low. The body echoes the amount shown, so a price or rate change between view
 * and click answers 409 price_changed, charges nothing, and the price is read
 * again with the choice kept. A free programme is enrolled with the programme
 * alone. A governance hold refuses here with its staff detail (errors.governance_hold).
 */
export default function StaffEnrolmentCard({ userId, user, programs, copy, language, typeLabel, onEnrolled, onReload }) {
  const text = walletCopy(language)
  const [programId, setProgramId] = useState('')
  const [currency, setCurrency] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const program = programs.find((item) => String(item.id) === String(programId)) || null
  const free = Boolean(program?.is_free)
  const price = program?.price && isMoney(program.price.usd) ? program.price : null
  const balances = walletBalances(user)
  const options = [
    { currency: 'USD', label: text.usdBalance, amount: price?.usd || null, balance: balances.usd },
    { currency: 'SYP', label: text.sypBalance, amount: isMoney(price?.syp) ? price.syp : null, balance: balances.syp },
  ]
  const enough = (option) => Boolean(option.amount) && (amountMinorOf(option.balance) ?? 0) >= (amountMinorOf(option.amount) ?? Infinity)
  const chosen = options.find((option) => option.currency === currency) || null
  const ready = !busy && Boolean(program) && (free || (Boolean(chosen) && enough(chosen)))

  function optionLabel(item) {
    const title = localize(item.title, language)
    const amount = item.is_free ? text.free : item.price && isMoney(item.price.usd) ? formatMoneyInline(item.price.usd, language) : text.priceNotSet
    return `${typeLabel(item.program_type)} · ${title} · ${amount}`
  }

  async function submit() {
    if (!ready) return
    setBusy(true)
    setNotice('')
    try {
      const body = free
        ? { program_id: Number(program.id) }
        : { program_id: Number(program.id), currency, expected_amount_minor: amountMinorOf(chosen.amount) }
      await enrollUserByStaff(userId, body)
      setProgramId('')
      setCurrency('')
      onEnrolled?.()
    } catch (error) {
      const data = error?.response?.data || {}
      if (Number(error?.response?.status) === 409 && data.code === 'price_changed') {
        // Nothing was charged: read the price again and keep the programme and the balance chosen.
        setNotice(fillWallet(text.priceChanged, { amount: formatMoneyInline(data.current_amount, language) }))
        onReload?.()
      } else {
        setNotice(walletRefusal(error, language) || readApiError(error, copy.enrollFailed, language))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle>{copy.professional}</CardTitle>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.professionalHint}</p>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {notice ? <p role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice}</p> : null}
        <Select
          label={copy.selectProgram}
          value={programId}
          onChange={(event) => { setProgramId(event.target.value); setNotice('') }}
          disabled={!programs.length}
          hint={!programs.length ? copy.noPrograms : undefined}
        >
          <option value="">{copy.selectProgram}</option>
          {programs.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
        </Select>
        {program && !free && !price ? <p className="text-sm text-[var(--color-text-muted)]">{text.priceNotSet}</p> : null}
        {program && price ? (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">{text.payFrom}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((option) => {
                const disabled = !option.amount || !enough(option)
                return (
                  <label key={option.currency} className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${disabled ? 'cursor-not-allowed border-dashed border-[var(--color-border)] opacity-60' : 'cursor-pointer border-[var(--color-border)]'} ${currency === option.currency ? 'border-[var(--color-primary)]' : ''}`}>
                    <input type="radio" name={`enrol-currency-${userId}`} value={option.currency} className="mt-1" checked={currency === option.currency} disabled={disabled} onChange={() => setCurrency(option.currency)} />
                    <span className="space-y-1">
                      <span className="block font-semibold">{option.label}: <Money value={option.balance} language={language} /></span>
                      {option.amount ? <span className="block"><bdi>{fillWallet(option.currency === 'SYP' ? text.sypAtToday : text.pays, { amount: formatMoneyInline(option.amount, language) })}</bdi></span> : <span className="block">{text.noRate}</span>}
                      {option.amount && !enough(option) ? <span className="block font-semibold text-amber-800">{text.tooLow}</span> : null}
                    </span>
                  </label>
                )
              })}
            </div>
            {!currency ? <p className="text-xs text-[var(--color-text-muted)]">{text.chooseBalance}</p> : null}
          </fieldset>
        ) : null}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={!ready}>
            {busy ? <LoaderCircle className="animate-spin" size={17} /> : <FilePlus2 size={17} />}
            {free ? text.enrollFree : currency === 'SYP' ? text.enrollPaySyp : text.enrollPayUsd}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
