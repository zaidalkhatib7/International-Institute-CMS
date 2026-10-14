import { Badge } from '../../../components/ui'

/*
 * ADVISORY PROVENANCE — owner requirement, 5 Aug 2026.
 *
 * The advisory must recommend programmes from the applicant's uploaded files
 * AND their answered assessment together. An assessor cannot judge whether that
 * happened unless the screen says so: a short recommendation list because
 * nothing was read looks identical to a short list because little was needed.
 *
 * Both components read the STORED input snapshot, so they describe the request
 * that was actually sent — not what the current settings would send today.
 */

/** What the advisory actually read: documents in, answers in, and what was withheld. */
export function AdvisoryInputsStrip({ snapshot, copy }) {
  const documents = snapshot?.evidence_documents
  const dynamic = snapshot?.dynamic_assessment
  if (!documents && !dynamic) return null

  const read = documents?.included?.length || 0
  const withheld = documents?.excluded?.length || 0
  const answered = dynamic?.answered_verification_count || 0
  const disabled = documents?.enabled === false
  const nothing = !disabled && read === 0 && answered === 0

  return (
    <section
      aria-label={copy.inputsUsed}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs"
    >
      <strong className="block">{copy.inputsUsed}</strong>
      <ul className="mt-2 space-y-1 text-[var(--color-text-muted)]">
        {disabled ? (
          <li className="text-amber-800">{copy.documentsOff}</li>
        ) : (
          <li>
            <bdi>{read}</bdi> {copy.documentsRead}
            {withheld ? (
              <span className="text-amber-800">
                {' · '}
                <bdi>{withheld}</bdi> {copy.documentsWithheld}
              </span>
            ) : null}
          </li>
        )}
        <li>
          <bdi>{answered}</bdi> {copy.answersRead}
        </li>
      </ul>
      {/* Both inputs empty is the case where every recommendation is necessarily
          conditional. Saying so stops a short list reading as a considered
          judgement when it is really an uninformed one. */}
      {nothing ? <p className="mt-2 text-amber-800">{copy.noInputs}</p> : null}
    </section>
  )
}

/*
 * A recommendation resting on a wrong answer or a read document is defensible
 * to an accreditor. One resting on absent evidence is a hypothesis. Only the
 * assessor can act on that difference, so the badge has to make it visible.
 *
 * Only a course that closes a gap makes that claim (owner flow of 12 Oct 2026,
 * R11). A course added to reach the per-level minimum (purpose
 * minimum_completion) claims no gap, so it says so instead of "Demonstrated
 * gap"; a course staff added (purpose staff_added) carries no claim from Gemini
 * at all, so it gets no badge.
 */
export function RecommendationGrounds({ course, copy }) {
  if (course?.purpose === 'staff_added') return null
  const topUp = course?.purpose === 'minimum_completion'
  const grounds = Array.isArray(course?.grounded_in) ? course.grounded_in : []
  // Advisories generated before provenance existed carry neither field.
  // Rendering nothing is honest; defaulting a badge would invent a claim.
  if (!topUp && !grounds.length && course?.is_conditional === undefined) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-2">
      {topUp ? (
        <Badge variant="neutral">{copy.claimsNoGap}</Badge>
      ) : course.is_conditional === false ? (
        <Badge variant="success">{copy.demonstrated}</Badge>
      ) : (
        <Badge variant="warning">{copy.conditional}</Badge>
      )}
      {grounds.length ? (
        <span className="text-xs text-[var(--color-text-muted)]">
          {copy.groundedIn}: {grounds.map((ground) => copy[`ground_${ground}`] || ground).join(' · ')}
        </span>
      ) : null}
    </div>
  )
}
