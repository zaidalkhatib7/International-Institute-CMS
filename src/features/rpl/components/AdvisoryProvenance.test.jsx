import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdvisoryInputsStrip, RecommendationGrounds } from './AdvisoryProvenance'

/*
 * These components exist to answer one question an assessor cannot otherwise
 * answer: did the advisory actually read the applicant's files and answers?
 *
 * Before 5 Aug 2026 it read neither — evidence metadata only, no assessment
 * results — and the same two courses came back for every case. The fix was to
 * supply both. The screen has to prove that happened for a given advisory, and
 * has to distinguish a gap the applicant demonstrated from one merely suspected,
 * because only the first is defensible to an accreditor.
 */

const copy = {
  inputsUsed: 'What this analysis rests on',
  documentsRead: 'applicant documents read',
  documentsWithheld: 'withheld',
  documentsOff: 'Document reading is switched off — the analysis used metadata only',
  answersRead: 'answered assessments',
  noInputs: 'No documents were read and no assessment has been answered, so every recommendation stays conditional.',
  groundedIn: 'Grounded in',
  ground_evidence_documents: 'applicant documents',
  ground_answered_assessment: 'assessment answers',
  conditional: 'Conditional — needs the governed assessment to confirm it',
  demonstrated: 'Demonstrated gap',
}

function snapshot(overrides = {}) {
  return {
    evidence_documents: { enabled: true, included: [{ evidence_id: 1 }, { evidence_id: 2 }], excluded: [] },
    dynamic_assessment: { answered_verification_count: 1 },
    ...overrides,
  }
}

describe('AdvisoryInputsStrip', () => {
  it('reports how many documents were read and how many assessments were answered', () => {
    render(<AdvisoryInputsStrip snapshot={snapshot()} copy={copy} />)
    const strip = screen.getByRole('region', { name: copy.inputsUsed })
    expect(strip).toHaveTextContent('2 applicant documents read')
    expect(strip).toHaveTextContent('1 answered assessments')
  })

  it('surfaces withheld documents, because a withheld file is not absent evidence', () => {
    render(
      <AdvisoryInputsStrip
        snapshot={snapshot({
          evidence_documents: {
            enabled: true,
            included: [{ evidence_id: 1 }],
            excluded: [{ evidence_id: 2, reason: 'unsupported_format' }],
          },
        })}
        copy={copy}
      />,
    )
    expect(screen.getByRole('region', { name: copy.inputsUsed })).toHaveTextContent('1 withheld')
  })

  it('says plainly when governance has switched document reading off', () => {
    render(
      <AdvisoryInputsStrip
        snapshot={snapshot({ evidence_documents: { enabled: false, included: [], excluded: [] } })}
        copy={copy}
      />,
    )
    expect(screen.getByText(copy.documentsOff)).toBeInTheDocument()
    // The "nothing was read" warning would be misleading here: the cause is a
    // deliberate setting, not an empty case.
    expect(screen.queryByText(copy.noInputs)).not.toBeInTheDocument()
  })

  it('warns when neither input was available, so a short list is not read as judgement', () => {
    render(
      <AdvisoryInputsStrip
        snapshot={snapshot({
          evidence_documents: { enabled: true, included: [], excluded: [] },
          dynamic_assessment: { answered_verification_count: 0 },
        })}
        copy={copy}
      />,
    )
    expect(screen.getByText(copy.noInputs)).toBeInTheDocument()
  })

  it('renders nothing for an advisory generated before provenance was recorded', () => {
    const { container } = render(<AdvisoryInputsStrip snapshot={{}} copy={copy} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('RecommendationGrounds', () => {
  it('marks a gap the applicant demonstrated and names both sources', () => {
    render(
      <RecommendationGrounds
        course={{ is_conditional: false, grounded_in: ['evidence_documents', 'answered_assessment'] }}
        copy={copy}
      />,
    )
    expect(screen.getByText(copy.demonstrated)).toBeInTheDocument()
    expect(screen.getByText(/applicant documents · assessment answers/)).toBeInTheDocument()
  })

  it('marks a recommendation resting only on absent evidence as conditional', () => {
    render(<RecommendationGrounds course={{ is_conditional: true, grounded_in: [] }} copy={copy} />)
    expect(screen.getByText(copy.conditional)).toBeInTheDocument()
  })

  it('treats a missing flag as conditional rather than assuming a demonstrated gap', () => {
    render(<RecommendationGrounds course={{ grounded_in: ['answered_assessment'] }} copy={copy} />)
    expect(screen.getByText(copy.conditional)).toBeInTheDocument()
  })

  it('renders nothing rather than inventing provenance for an older advisory', () => {
    const { container } = render(<RecommendationGrounds course={{ reason: 'legacy' }} copy={copy} />)
    expect(container).toBeEmptyDOMElement()
  })
})
