import { AlertTriangle, CheckCircle2, FileText, Info } from 'lucide-react'
import { projectEvidenceReadability } from '../domain/evidenceReadability'

/*
 * THE FAILURE THE OWNER WOULD NEVER CATCH.
 *
 * "The questions must be based on the client files." An applicant uploads a
 * .docx CV, the reader silently withholds it, and twenty-five questions come
 * back reading as though somebody had studied the man's career. Nothing in the
 * old screen said otherwise. The server now refuses to generate when documents
 * exist and none can be read — but that refusal arrives after the attempt, and
 * the remedy (ask for a PDF) belongs before it.
 *
 * So this renders the projection BEFORE the generate button: which files the
 * analysis engine will read, which it will not, and why each one.
 */

/* eslint-disable-next-line react-refresh/only-export-components -- exported so the
   test can prove all three language blocks expose the same key set. Copy lookup is
   a WHOLE-OBJECT fallback (COPY[language] || COPY.en) with no per-key rescue, so a
   key present in en and missing in ar renders the string "undefined". */
export const COPY = {
  ar: {
    title: 'ملفات المتقدم التي ستُبنى منها الأسئلة',
    disabled:
      'قراءة ملفات المتقدم معطّلة في إعدادات RPL، لذلك ستُبنى الأسئلة على بيانات الملف الوصفية والملف الشخصي المُصرَّح به فقط. لم يُحجب شيء هنا عن غير قصد.',
    none: 'لم تُرفع أي أدلة لهذا الطلب بعد، لذلك ستستند الأسئلة إلى بيانات الملف الوصفية والملف الشخصي المُصرَّح به فقط.',
    refused:
      'تعذّرت قراءة أي ملف من الملفات المرفوعة ({total})، وسيُرفض التوليد. يجب أن تأتي الأسئلة من ملفات المتقدم نفسها، والتوليد من غير أي ملف ينتج أسئلة تبدو مبنية عليها وهي ليست كذلك.',
    refusedRemedy:
      'اطلب من المتقدم إعادة رفع الملفات المتأثرة بصيغة PDF أو PNG أو JPEG أو WEBP أو HEIC أو HEIF أو نص عادي، ثم ولّد الأسئلة.',
    readable: 'ستُقرأ {count} من {total} من الملفات المرفوعة.',
    allReadable: 'ستُقرأ كل الملفات المرفوعة ({total}).',
    withheldTitle: 'محجوبة — لن يراها محرك التحليل',
    untitled: 'دليل بلا عنوان',
    note: 'فحص مبدئي من بيانات الرفع. الخادم هو من يقرأ الملفات ويقرر نهائيًا، وقد يحجب ملفًا تتوقع هذه القائمة قراءته.',
    reasons: {
      no_uploaded_file: 'لا يوجد ملف مرفوع (رابط خارجي أو إقرار فقط)',
      unsupported_format: 'الصيغة غير قابلة للقراءة — أعد رفعه بصيغة PDF أو PNG أو JPEG أو نص عادي',
      file_too_large: 'الملف يتجاوز الحد الأقصى لحجم المستند الواحد (4 ميغابايت)',
      document_limit_reached: 'بلغ الطلب الحد الأقصى لعدد المستندات',
      request_size_limit_reached: 'بلغ الطلب الحد الأقصى لحجمه الكلي',
      file_unreadable: 'تعذّرت قراءة الملف المخزَّن',
    },
  },
  en: {
    title: 'The applicant files these questions will be built from',
    disabled:
      'Reading applicant documents is switched off in RPL settings, so the questions will rest on the case metadata and the declared profile only. Nothing here was withheld by accident.',
    none: 'No evidence has been uploaded for this application yet, so the questions will rest on the case metadata and the applicant’s declared profile only.',
    refused:
      'None of the {total} uploaded documents can be read, and generation will be refused. The questions have to come from the applicant’s own files; generating from none of them produces questions that only look as though they were.',
    refusedRemedy:
      'Ask the applicant to re-upload the affected documents as PDF, PNG, JPEG, WEBP, HEIC, HEIF or plain text, then generate.',
    readable: '{count} of {total} uploaded documents will be read.',
    allReadable: 'All {total} uploaded documents will be read.',
    withheldTitle: 'Withheld — the analysis engine will not see these',
    untitled: 'untitled evidence',
    note: 'Checked here from the upload details. The server reads the files and decides finally; it can still withhold one this list expects to be read.',
    reasons: {
      no_uploaded_file: 'no file was uploaded (external link or declaration only)',
      unsupported_format: 'the format cannot be read — re-upload it as PDF, PNG, JPEG or plain text',
      file_too_large: 'the file is over the 4 MB per-document limit',
      document_limit_reached: 'the per-request document limit was reached',
      request_size_limit_reached: 'the total request size limit was reached',
      file_unreadable: 'the stored file could not be read',
    },
  },
  nl: {
    title: 'De documenten van de aanvrager waarop deze vragen worden gebouwd',
    disabled:
      'Het lezen van documenten van de aanvrager staat uit in de RPL-instellingen, dus de vragen berusten alleen op de dossiermetadata en het opgegeven profiel. Er is hier niets per ongeluk achtergehouden.',
    none: 'Er is nog geen bewijs geüpload voor dit dossier, dus de vragen berusten alleen op de dossiermetadata en het opgegeven profiel van de aanvrager.',
    refused:
      'Geen van de {total} geüploade documenten kan worden gelezen en het genereren wordt geweigerd. De vragen moeten uit de eigen documenten van de aanvrager komen; genereren zonder ook maar één document levert vragen op die er alleen maar zo uitzien.',
    refusedRemedy:
      'Vraag de aanvrager de betrokken documenten opnieuw te uploaden als PDF, PNG, JPEG, WEBP, HEIC, HEIF of platte tekst en genereer daarna.',
    readable: '{count} van de {total} geüploade documenten worden gelezen.',
    allReadable: 'Alle {total} geüploade documenten worden gelezen.',
    withheldTitle: 'Achtergehouden — de analyse-engine ziet deze niet',
    untitled: 'bewijs zonder titel',
    note: 'Hier gecontroleerd op basis van de uploadgegevens. De server leest de bestanden en beslist definitief; die kan een bestand alsnog achterhouden dat deze lijst als leesbaar aanmerkt.',
    reasons: {
      no_uploaded_file: 'er is geen bestand geüpload (externe link of alleen verklaring)',
      unsupported_format: 'de indeling kan niet worden gelezen — upload opnieuw als PDF, PNG, JPEG of platte tekst',
      file_too_large: 'het bestand is groter dan de limiet van 4 MB per document',
      document_limit_reached: 'de documentlimiet per verzoek is bereikt',
      request_size_limit_reached: 'de totale groottelimiet van het verzoek is bereikt',
      file_unreadable: 'het opgeslagen bestand kon niet worden gelezen',
    },
  },
}

function fill(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    String(template || ''),
  )
}

export default function EvidenceReadinessNotice({ evidence, language, enabled = true }) {
  const copy = COPY[language] || COPY.en

  // No evidence array means the caller does not know, which is not the same as
  // "no documents". Claiming either way would be an invention.
  if (!Array.isArray(evidence)) return null

  const projection = projectEvidenceReadability(evidence)

  if (!enabled) {
    return (
      <section
        aria-label={copy.title}
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
      >
        <Info className="mt-0.5 shrink-0" size={18} />
        <div>
          <strong className="block">{copy.title}</strong>
          <p className="mt-1">{copy.disabled}</p>
        </div>
      </section>
    )
  }

  if (!projection.hasEvidence) {
    return (
      <section
        aria-label={copy.title}
        className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-text-muted)]"
      >
        <FileText className="mt-0.5 shrink-0" size={18} />
        <div>
          <strong className="block text-[var(--color-text)]">{copy.title}</strong>
          <p className="mt-1">{copy.none}</p>
        </div>
      </section>
    )
  }

  const refused = projection.generationWillRefuse
  const tone = refused
    ? 'border-red-200 bg-red-50 text-red-800'
    : projection.withheld.length
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-green-200 bg-green-50 text-green-800'

  return (
    <section aria-label={copy.title} className={`rounded-2xl border p-4 text-sm leading-6 ${tone}`}>
      <div className="flex items-start gap-3">
        {projection.withheld.length ? (
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
        ) : (
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
        )}
        <div className="min-w-0 flex-1">
          <strong className="block">{copy.title}</strong>
          <p className="mt-1">
            {refused
              ? fill(copy.refused, { total: projection.total })
              : projection.withheld.length
                ? fill(copy.readable, { count: projection.readable.length, total: projection.total })
                : fill(copy.allReadable, { total: projection.total })}
          </p>
          {refused ? <p className="mt-1 font-semibold">{copy.refusedRemedy}</p> : null}

          {projection.withheld.length ? (
            <div className="mt-3">
              <strong className="block text-xs uppercase tracking-wide">{copy.withheldTitle}</strong>
              <ul className="mt-2 space-y-1">
                {projection.withheld.map((row, index) => (
                  <li key={row.evidence_id ?? index}>
                    <bdi className="font-semibold">#{row.evidence_id ?? '—'}</bdi>{' '}
                    <bdi>{row.title || copy.untitled}</bdi>
                    {' — '}
                    {copy.reasons[row.reason] || row.reason}
                    {row.mime_type ? (
                      <>
                        {' ('}
                        <bdi>{row.mime_type}</bdi>
                        {')'}
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-3 text-xs opacity-80">{copy.note}</p>
        </div>
      </div>
    </section>
  )
}
