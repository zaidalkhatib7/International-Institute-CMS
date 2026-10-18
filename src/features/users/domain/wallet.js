import { CHARGEABLE_CURRENCIES, amountMinorOf, formatMoneyInline, fromMinor, isMoney, money, toMinor } from '../../../utils/money'

/*
 * THE CLIENT'S WALLET ON THE PLATFORM (owner decisions of 17 Oct 2026).
 *
 * Two balances, US dollars and Syrian pounds, never converted between them and
 * never added together. Staff top up the balance of the currency the institute
 * received (cash, bank transfer, Syriatel Cash, MTN Cash, other), and the client
 * pays from the balance he chooses. A deduction corrects a balance with a reason.
 * Both acts are audited and idempotent. Until 17 Oct 2026 the wallet held points:
 * each balance became the same number of US dollars, and the earlier movements
 * stay as they were recorded, shown as history.
 */

export const TOP_UP_METHODS = Object.freeze(['cash', 'bank_transfer', 'syriatel_cash', 'mtn_cash', 'other'])
export const WALLET_LIMITS = Object.freeze({ referenceMin: 3, referenceMax: 255, notesMax: 2000, reasonMin: 10, reasonMax: 2000 })
/** The largest single movement (contract 2.2): $1,000,000.00, or 999,999,999,999 pounds. */
export const MAX_MOVEMENT_MINOR = Object.freeze({ USD: 100000000, SYP: 999999999999 })
/** A top-up above $10,000.00, or below 1,000 pounds, is probably in the wrong currency (R5). */
export const IMPLAUSIBLE = Object.freeze({ usdAboveMinor: 1000000, sypBelowMinor: 1000 })
/** The ledger filter: all, the two currencies, and the earlier records. */
export const LEDGER_FILTERS = Object.freeze(['all', 'USD', 'SYP', 'legacy'])

const ZERO = Object.freeze({ usd: money(0, 'USD'), syp: money(0, 'SYP') })

/** A user's two balances (contract S6 wallet_balances), each a Money; a missing one reads 0. */
export function walletBalances(user) {
  const balances = user?.wallet_balances
  return {
    usd: isMoney(balances?.usd) ? balances.usd : ZERO.usd,
    syp: isMoney(balances?.syp) ? balances.syp : ZERO.syp,
  }
}

export function balanceMinor(user, currency) {
  const balances = walletBalances(user)
  return amountMinorOf(currency === 'SYP' ? balances.syp : balances.usd) ?? 0
}

export function hasAnyBalance(user) {
  return balanceMinor(user, 'USD') > 0 || balanceMinor(user, 'SYP') > 0
}

/** The users list's wallet filter: above 0 in either currency, or 0 in both. */
export function walletMatchesFilter(user, filter) {
  if (filter === 'positive') return hasAnyBalance(user)
  if (filter === 'zero') return !hasAnyBalance(user)
  return true
}

/** The users list's sort on a balance, by its integer of minor units, never across currencies. */
export function walletSortValue(user, sortBy) {
  if (sortBy === 'wallet_usd') return balanceMinor(user, 'USD')
  if (sortBy === 'wallet_syp') return balanceMinor(user, 'SYP')
  return null
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/** The users CSV: one column per balance, each a decimal string at its currency's scale. */
export function buildUsersCsv(users, language) {
  const headers = language === 'ar'
    ? ['المعرف', 'الاسم', 'البريد الإلكتروني', 'الدور', 'تاريخ التسجيل', 'المحفظة بالدولار (USD)', 'المحفظة بالليرة (SYP)']
    : ['ID', 'Name', 'Email', 'Role', 'Registration Date', 'Wallet USD', 'Wallet SYP']
  const rows = (Array.isArray(users) ? users : []).map((user) => [
    `ICPC-${user.id}`,
    user.name || '',
    user.email || '',
    user.role || '',
    user.created_at || '',
    fromMinor(balanceMinor(user, 'USD'), 'USD'),
    fromMinor(balanceMinor(user, 'SYP'), 'SYP'),
  ])
  return [headers, ...rows].map((line) => line.map(csvCell).join(',')).join('\n')
}

/** The amount of a top-up or deduction typed in that currency, as minor units, or null. */
export function movementMinor(form) {
  if (!CHARGEABLE_CURRENCIES.includes(form?.currency)) return null
  return toMinor(form?.amount, form.currency)
}

/*
 * What stops the form, by field ('' when valid), as the API checks it (S3, S4):
 * a currency with no default; an amount above 0 in that currency's minor units
 * (cents for dollars only) and within one movement's limit; for a top-up the
 * method, a reference unless cash, the date received no later than today and
 * notes when the method is other; for a deduction a reason of 10 to 2000.
 */
export function walletFormErrors(action, form, today) {
  const errors = { currency: '', amount: '', method: '', reference: '', received_on: '', notes: '', reason: '' }
  if (!CHARGEABLE_CURRENCIES.includes(form?.currency)) errors.currency = 'currency'
  const minor = movementMinor(form)
  if (!errors.currency && (minor == null || minor <= 0 || minor > MAX_MOVEMENT_MINOR[form.currency])) errors.amount = 'amount'
  if (action === 'deduct') {
    const reason = String(form?.reason ?? '').trim().length
    if (reason < WALLET_LIMITS.reasonMin || reason > WALLET_LIMITS.reasonMax) errors.reason = 'reason'
    return errors
  }
  if (!TOP_UP_METHODS.includes(form?.method)) errors.method = 'method'
  const reference = String(form?.reference ?? '').trim().length
  const referenceNeeded = form?.method !== 'cash'
  if ((referenceNeeded || reference > 0) && (reference < WALLET_LIMITS.referenceMin || reference > WALLET_LIMITS.referenceMax)) errors.reference = 'reference'
  const receivedOn = String(form?.received_on ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn) || receivedOn > today) errors.received_on = 'received_on'
  const notes = String(form?.notes ?? '').trim().length
  if ((form?.method === 'other' && notes === 0) || String(form?.notes ?? '').length > WALLET_LIMITS.notesMax) errors.notes = 'notes'
  return errors
}

export function isWalletFormValid(action, form, today) {
  return Object.values(walletFormErrors(action, form, today)).every((value) => value === '')
}

/** The S3 or S4 body, exactly the API's keys. */
export function walletPayload(action, form) {
  const base = { currency: form.currency, amount_minor: movementMinor(form) }
  if (action === 'deduct') return { ...base, reason: String(form.reason).trim() }
  const reference = String(form.reference ?? '').trim()
  const notes = String(form.notes ?? '').trim()
  return {
    ...base,
    method: form.method,
    ...(reference ? { reference } : {}),
    received_on: String(form.received_on).trim(),
    ...(notes ? { notes } : {}),
  }
}

/** A dollar amount above $10,000.00 or a pound amount below 1,000: say "check the currency" before confirming (R5). */
export function isImplausibleAmount(currency, minor) {
  if (!Number.isSafeInteger(minor)) return false
  if (currency === 'USD') return minor > IMPLAUSIBLE.usdAboveMinor
  if (currency === 'SYP') return minor < IMPLAUSIBLE.sypBelowMinor
  return false
}

export const WALLET_COPY = {
  ar: {
    title: 'المحفظة',
    hint: 'رصيدان لا يُحوَّل أحدهما إلى الآخر ولا يُجمعان: يُشحن المبلغ بالعملة التي استُلم بها، ويدفع العميل من الرصيد الذي يختاره.',
    balances: 'أرصدة المحفظة',
    usdBalance: 'رصيد الدولار',
    sypBalance: 'رصيد الليرة السورية',
    // Over every open wallet, whatever the list's filter (money spec S6), and labelled so (UI-20).
    usdTotals: 'أرصدة الدولار الأمريكي في كل المحافظ (لا تتبع التصفية)',
    sypTotals: 'أرصدة الليرة السورية في كل المحافظ (لا تتبع التصفية)',
    totalsHint: 'مجموع أرصدة العملاء المفتوحة بهذه العملة، ولا يُجمع مع العملة الأخرى.',
    topUp: 'شحن الرصيد',
    deduct: 'خصم من الرصيد',
    topUpTitle: 'شحن رصيد العميل',
    deductTitle: 'خصم من رصيد العميل',
    topUpHint: 'اشحن فقط مبلغًا استلمته المؤسسة، وبالعملة التي استُلم بها. لا يُحوَّل رصيد بين الدولار والليرة أبدًا.',
    deductHint: 'يصحّح الخصم رصيدًا، مثل شحن أُدخل بالعملة الخطأ. يحتاج إلى سبب، ويُحفظ في سجل التدقيق.',
    client: 'العميل: {name}',
    currency: 'أي رصيد',
    currencyUsd: 'بالدولار الأمريكي ($)',
    currencySyp: 'بالليرة السورية (ل.س)',
    currencyRequired: 'اختر الرصيد أولًا: لا يوجد اختيار افتراضي.',
    amount: 'المبلغ',
    usdInvalid: 'أدخل مبلغًا أكبر من صفر بالدولار الأمريكي بخانتين عشريتين على الأكثر، مثل 49.99، ولا يتجاوز 1,000,000.00.',
    sypInvalid: 'أدخل عددًا صحيحًا من الليرات السورية أكبر من صفر، مثل 125000.',
    method: 'وسيلة الاستلام',
    // What a movement was for, in words (UI-13): the API's own label is English.
    subjects: { course: 'دورة', rplCharge: 'دفعة لطلب RPL', movement: 'حركة المحفظة رقم {id}' },
    methods: {
      cash: 'نقدًا',
      bank_transfer: 'حوالة بنكية',
      syriatel_cash: 'سيريتل كاش',
      mtn_cash: 'MTN كاش',
      other: 'أخرى',
    },
    reference: 'المرجع (من 3 إلى 255 حرفًا؛ غير مطلوب للنقد)',
    referenceInvalid: 'اكتب مرجعًا من 3 إلى 255 حرفًا.',
    receivedOn: 'تاريخ الاستلام',
    receivedOnInvalid: 'اختر تاريخًا لا يتجاوز اليوم.',
    notes: 'ملاحظات (مطلوبة عند اختيار «أخرى»)',
    notesInvalid: 'صف طريقة استلام المبلغ (بحد أقصى 2000 حرف).',
    reason: 'السبب (من 10 إلى 2000 حرف، يُحفظ في سجل التدقيق)',
    reasonInvalid: 'اكتب ما بين 10 و2000 حرف.',
    continue: 'متابعة',
    back: 'رجوع',
    confirmTopUp: 'إضافة {amount} إلى {balance} لدى {name}؟',
    confirmDeduct: 'خصم {amount} من {balance} لدى {name}؟',
    balanceUsdWords: 'رصيد الدولار الأمريكي',
    balanceSypWords: 'رصيد الليرة السورية',
    checkCurrency: 'تحقّق من العملة: {amount}.',
    confirm: 'تأكيد',
    processing: 'جارٍ الحفظ…',
    toppedUp: 'أُضيف {amount}. {balance} الآن: {new}',
    deducted: 'خُصم {amount}. {balance} الآن: {new}',
    referenceUsed: 'هذا المرجع مسجّل من قبل على شحن آخر أو دفعة أخرى. تحقّق منه، وأضف بادئة إن كان لإيصالين الرقم نفسه فعلًا.',
    insufficient: 'الرصيد غير كافٍ: المتاح {balance} والمطلوب {required}. لم يُخصم شيء.',
    failed: 'تعذّر إكمال الإجراء.',
    loadFailed: 'تعذّر تحميل بيانات العميل.',
    backToClient: 'العودة إلى العميل',
    backToUsers: 'العودة إلى المستخدمين',
    ledger: 'حركات المحفظة',
    filter: 'عرض',
    filters: {
      all: 'الكل',
      USD: 'الدولار الأمريكي',
      SYP: 'الليرة السورية',
      legacy: 'سجلات سابقة (نقاط)',
    },
    legacyNote: 'حتى 17 أكتوبر 2026 كانت المحفظة تحفظ نقاطًا. نُقل كل رصيد إلى الدولار الأمريكي بالرقم نفسه، وتبقى السجلات السابقة كما سُجّلت.',
    empty: 'لا توجد حركات في المحفظة بعد.',
    ledgerFailed: 'تعذّر تحميل حركات المحفظة.',
    date: 'التاريخ',
    movement: 'الحركة',
    amountColumn: 'المبلغ',
    balanceAfter: 'الرصيد بعدها',
    details: 'التفاصيل',
    credit: 'إضافة',
    debit: 'خصم',
    by: 'بواسطة {name}',
    kinds: {
      course_purchase: 'شراء دورة',
      course_refund: 'استرداد ثمن دورة',
      rpl_payment: 'دفعة لطلب RPL',
      rpl_refund: 'استرداد دفعة لطلب RPL',
      top_up: 'شحن',
      deduction: 'خصم تصحيحي',
      conversion: 'نقل رصيد النقاط إلى الدولار الأمريكي',
      legacy: 'نقاط (سجل سابق)',
    },
    previous: 'السابق',
    next: 'التالي',
    payFrom: 'الدفع من',
    pays: 'يدفع {amount}',
    sypAtToday: 'يدفع {amount} بسعر اليوم',
    tooLow: 'الرصيد غير كافٍ',
    free: 'مجاني',
    priceNotSet: 'لا سعر مضبوط: لا يُباع بعد.',
    enrollPayUsd: 'سجّل وادفع من رصيد الدولار',
    enrollPaySyp: 'سجّل وادفع من رصيد الليرة',
    enrollFree: 'سجّل (مجاني)',
    chooseBalance: 'اختر الرصيد الذي يُدفع منه.',
    priceChanged: 'تغيّر السعر منذ عرضه، وأصبح {amount}. لم يُخصم شيء؛ راجعه ثم سجّل من جديد.',
    noRate: 'لم يُضبط سعر صرف: لا يمكن لأحد الدفع بالليرة السورية حتى يُضبط. ولا يتأثر الدفع بالدولار.',
  },
  en: {
    title: 'Wallet',
    hint: 'Two balances, never converted between them and never added together: money is topped up in the currency it was received in, and the client pays from the balance he chooses.',
    balances: 'Wallet balances',
    usdBalance: 'US-dollar balance',
    sypBalance: 'Syrian-pound balance',
    usdTotals: 'US-dollar balances, all wallets (not filtered)',
    sypTotals: 'Syrian-pound balances, all wallets (not filtered)',
    totalsHint: 'All clients\' open balances in this currency, never added to the other.',
    topUp: 'Top up',
    deduct: 'Deduct',
    topUpTitle: 'Top up the client\'s balance',
    deductTitle: 'Deduct from the client\'s balance',
    topUpHint: 'Top up only money the institute has received, in the currency it was received in. Balances are never converted between dollars and pounds.',
    deductHint: 'A deduction corrects a balance, for example a top-up entered in the wrong currency. It needs a reason and is kept in the audit trail.',
    client: 'Client: {name}',
    currency: 'Which balance',
    currencyUsd: 'US dollars ($)',
    currencySyp: 'Syrian pounds (SYP)',
    currencyRequired: 'Choose the balance first: there is no default.',
    amount: 'Amount',
    usdInvalid: 'Enter an amount above zero in US dollars with at most two decimals, such as 49.99, and no more than 1,000,000.00.',
    sypInvalid: 'Enter a whole number of Syrian pounds above zero, such as 125000.',
    method: 'How it was received',
    subjects: { course: 'Course', rplCharge: 'RPL payment', movement: 'Wallet movement #{id}' },
    methods: {
      cash: 'Cash',
      bank_transfer: 'Bank transfer',
      syriatel_cash: 'Syriatel Cash',
      mtn_cash: 'MTN Cash',
      other: 'Other',
    },
    reference: 'Reference (3 to 255 characters; not needed for cash)',
    referenceInvalid: 'Write a reference of 3 to 255 characters.',
    receivedOn: 'Date received',
    receivedOnInvalid: 'Choose a date no later than today.',
    notes: 'Notes (required for other)',
    notesInvalid: 'Describe how the money was received (at most 2,000 characters).',
    reason: 'Reason (10 to 2,000 characters, kept in the audit trail)',
    reasonInvalid: 'Write between 10 and 2,000 characters.',
    continue: 'Continue',
    back: 'Back',
    confirmTopUp: 'Add {amount} to the {balance} of {name}?',
    confirmDeduct: 'Deduct {amount} from the {balance} of {name}?',
    balanceUsdWords: 'US-dollar balance',
    balanceSypWords: 'Syrian-pound balance',
    checkCurrency: 'Check the currency: {amount}.',
    confirm: 'Confirm',
    processing: 'Saving…',
    toppedUp: '{amount} added. {balance} now: {new}',
    deducted: '{amount} deducted. {balance} now: {new}',
    referenceUsed: 'This reference is already recorded on another top-up or payment. Check it; prefix it if two receipts truly share a number.',
    insufficient: 'The balance is too low: {balance} available, {required} needed. Nothing was deducted.',
    failed: 'The action could not be completed.',
    loadFailed: 'Unable to load the client.',
    backToClient: 'Back to the client',
    backToUsers: 'Back to users',
    ledger: 'Wallet movements',
    filter: 'Show',
    filters: {
      all: 'All',
      USD: 'US dollars',
      SYP: 'Syrian pounds',
      legacy: 'Earlier records (points)',
    },
    legacyNote: 'Until 17 Oct 2026 the wallet held points. Each balance was carried into US dollars as the same number; the earlier rows stay as they were recorded.',
    empty: 'No wallet movement yet.',
    ledgerFailed: 'Unable to load the wallet movements.',
    date: 'Date',
    movement: 'Movement',
    amountColumn: 'Amount',
    balanceAfter: 'Balance after',
    details: 'Details',
    credit: 'Credit',
    debit: 'Debit',
    by: 'By {name}',
    kinds: {
      course_purchase: 'Course purchase',
      course_refund: 'Course refund',
      rpl_payment: 'RPL payment',
      rpl_refund: 'RPL refund',
      top_up: 'Top-up',
      deduction: 'Correction (deduction)',
      conversion: 'Points carried into US dollars',
      legacy: 'Points (earlier record)',
    },
    previous: 'Previous',
    next: 'Next',
    payFrom: 'Pay from',
    pays: 'pays {amount}',
    sypAtToday: 'pays {amount} at today\'s rate',
    tooLow: 'balance too low',
    free: 'Free',
    priceNotSet: 'No price is set: not buyable yet.',
    enrollPayUsd: 'Enrol and pay from the US-dollar balance',
    enrollPaySyp: 'Enrol and pay from the Syrian-pound balance',
    enrollFree: 'Enrol (free)',
    chooseBalance: 'Choose the balance to pay from.',
    priceChanged: 'The price changed since it was shown: it is now {amount}. Nothing was charged; check it and enrol again.',
    noRate: 'No exchange rate is set: nobody can pay in Syrian pounds until one is set. Dollar payments are not affected.',
  },
}

export function walletCopy(language) {
  return WALLET_COPY[language === 'ar' ? 'ar' : 'en']
}

export function fillWallet(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)
}

/** "the US-dollar balance" / "the Syrian-pound balance", in words. */
export function balanceWords(currency, language) {
  const copy = walletCopy(language)
  return currency === 'SYP' ? copy.balanceSypWords : copy.balanceUsdWords
}

/*
 * A refusal of a money act as a sentence: 409 payment_reference_used and 422
 * insufficient_balance (with the balance and the amount needed, both Money) get
 * their own; anything else is null, for readApiError.
 */
export function walletRefusal(error, language) {
  const copy = walletCopy(language)
  const status = Number(error?.response?.status)
  const data = error?.response?.data || {}
  if (status === 409 && data.code === 'payment_reference_used') return copy.referenceUsed
  if (status === 422 && data.reason_code === 'insufficient_balance') {
    return fillWallet(copy.insufficient, { balance: formatMoneyInline(data.balance, language), required: formatMoneyInline(data.required, language) })
  }
  if (Number(error?.response?.status) === 503 && data.code === 'exchange_rate_missing') return copy.noRate
  return null
}

/*
 * THE LEDGER'S DETAILS IN THE SCREEN'S LANGUAGE (platform walk, 17 Oct 2026, UI-13).
 *
 * The API writes each movement's description itself, in English ("Money received
 * by the institute (bank transfer)", "Correction by the institute", "Enrolled in:
 * …"), and its subject label too ("Course: …", "RPL payment: …"). For a movement
 * of a known kind the kind, the method and the subject already say it, so the
 * English description is not repeated; the subject is worded from the course's
 * own titles and the charge's type. A legacy row keeps its description: nothing
 * else says what it was.
 */
const SERVER_WORDED_KINDS = ['top_up', 'deduction', 'course_purchase', 'course_refund', 'rpl_payment', 'rpl_refund', 'conversion']

export function ledgerDescription(row) {
  if (!row?.description) return ''
  return SERVER_WORDED_KINDS.includes(row?.kind) ? '' : String(row.description)
}

export function ledgerSubjectText(subject, language, chargeTypeLabel = (type) => type) {
  if (!subject || typeof subject !== 'object') return ''
  const copy = walletCopy(language).subjects
  const lang = language === 'ar' ? 'ar' : 'en'
  if (subject.type === 'enrollment') {
    const title = subject.title && typeof subject.title === 'object' ? (subject.title[lang] || subject.title.en || subject.title.ar) : ''
    return `${copy.course}: ${title || String(subject.label ?? '').replace(/^Course: /, '')}`
  }
  if (subject.type === 'rpl_charge') {
    const type = subject.charge_type || String(subject.label ?? '').replace(/^RPL payment: /, '').replaceAll(' ', '_')
    return `${copy.rplCharge}: ${chargeTypeLabel(type, language)}`
  }
  if (subject.type === 'wallet_transaction') return fillWallet(copy.movement, { id: subject.id })
  return String(subject.label ?? '')
}

/** A ledger row's movement in words (kind NULL is a legacy points row). */
export function ledgerKindLabel(row, language) {
  const kinds = walletCopy(language).kinds
  return kinds[row?.kind || 'legacy'] || String(row?.kind ?? '').replaceAll('_', ' ')
}
