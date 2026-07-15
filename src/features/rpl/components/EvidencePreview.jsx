import { useEffect, useState } from 'react'
import { Download, ExternalLink, FileText, LoaderCircle, X } from 'lucide-react'
import { Button } from '../../../components/ui'
import { evidencePreviewKind } from '../domain/rpl'
import { fetchRplEvidenceSignedUrl } from '../services/rplService'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { useModalDialog } from '../../../hooks/useModalDialog'

const copy = {
  ar: { preview: 'معاينة الدليل', close: 'إغلاق المعاينة', open: 'فتح في نافذة جديدة', download: 'تنزيل', unavailable: 'لا تتوفر معاينة داخلية لهذا النوع.' },
  en: { preview: 'Evidence preview', close: 'Close preview', open: 'Open in new window', download: 'Download', unavailable: 'Inline preview is not available for this file type.' },
  nl: { preview: 'Bewijsvoorbeeld', close: 'Voorbeeld sluiten', open: 'Openen in nieuw venster', download: 'Downloaden', unavailable: 'Voor dit bestandstype is geen ingebouwd voorbeeld beschikbaar.' },
}

export default function EvidencePreview({ evidence, language = 'en', onClose }) {
  const text = copy[language] || copy.en
  const [state, setState] = useState({ loading: true, url: '', error: '' })
  const media = evidence?.media || evidence?.file || {}
  const kind = evidence?.kind === 'url'
    ? 'url'
    : evidencePreviewKind(media.mime_type, media.original_name || evidence?.file_name)
  const dialogRef = useModalDialog(Boolean(evidence), onClose)

  useEffect(() => {
    let active = true
    async function load() {
      if (kind === 'url') {
        setState({ loading: false, url: evidence.external_url || evidence.verification_url || '', error: '' })
        return
      }
      try {
        const response = unwrapApiData(await fetchRplEvidenceSignedUrl(evidence.public_id || evidence.id))
        if (active) setState({ loading: false, url: response?.url || response?.signed_url || '', error: '' })
      } catch (error) {
        if (active) setState({ loading: false, url: '', error: readApiError(error) })
      }
    }
    load()
    return () => { active = false }
  }, [evidence, kind])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031C2C]/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={text.preview} className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-2xl outline-none">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-bold text-[var(--color-text)]">{text.preview}</h2>
            <p className="truncate text-sm text-[var(--color-text-muted)]">{evidence.title || media.original_name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-black/5" aria-label={text.close}>
            <X size={21} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[var(--color-surface-muted)] p-4 sm:p-6">
          {state.loading ? (
            <div className="flex min-h-80 items-center justify-center"><LoaderCircle className="animate-spin" /></div>
          ) : state.error ? (
            <div className="flex min-h-80 items-center justify-center text-red-600">{state.error}</div>
          ) : kind === 'image' ? (
            <img src={state.url} alt={evidence.title || media.original_name || text.preview} className="mx-auto max-h-[65vh] max-w-full rounded-xl object-contain" />
          ) : kind === 'pdf' ? (
            <iframe title={text.preview} src={state.url} className="h-[65vh] w-full rounded-xl border-0 bg-white" />
          ) : kind === 'video' ? (
            <video controls src={state.url} className="mx-auto max-h-[65vh] max-w-full rounded-xl" />
          ) : kind === 'audio' ? (
            <div className="flex min-h-80 items-center justify-center"><audio controls src={state.url} className="w-full max-w-xl" /></div>
          ) : kind === 'url' ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
              <ExternalLink size={42} className="text-[var(--color-primary)]" />
              <a href={state.url} target="_blank" rel="noreferrer" className="break-all font-semibold text-[var(--color-primary)] underline">{state.url}</a>
            </div>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center text-[var(--color-text-muted)]">
              <FileText size={48} /> <p>{text.unavailable}</p>
            </div>
          )}
        </div>

        {state.url ? (
          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] px-5 py-4">
            <Button variant="outline" size="sm" onClick={() => window.open(state.url, '_blank', 'noopener,noreferrer')}>
              {kind === 'document' ? <Download size={16} /> : <ExternalLink size={16} />}
              {kind === 'document' ? text.download : text.open}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
