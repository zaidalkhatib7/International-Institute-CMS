# ICPC Platform API — developer handoff, 4 August 2026

Supersedes `admin_cms_api_updates_2026-04-21.md`. That document covered the quiz
architecture change in April; this one covers everything added since, and then
indexes the complete surface so nothing has to be guessed at.

Read sections 1–3 first. They are the conventions that apply to every call and
they explain two response shapes that are easy to get wrong.

---

## 1. Basics

| | |
| --- | --- |
| Base URL | `https://icpc.glanzly-service.de/api/v1` |
| Admin CMS | `https://icpc.glanzly-service.de/cms/` |
| Auth | Laravel Sanctum bearer token |
| Content type | `application/json` |

Send both headers on every request. Without `Accept`, validation failures come
back as an HTML redirect instead of JSON:

```
Authorization: Bearer <token>
Accept: application/json
```

Admin endpoints additionally require a permission, listed per row in the index.
A caller who is authenticated but unauthorised gets `403`, not `404` — if you
receive `404` on an admin route, the route genuinely does not exist on that
deployment.

### Rate limits

Write endpoints sit behind `throttle:admin-write`. On breach you get `429` with
a `Retry-After` header. Treat it as backoff-and-retry, not as failure.

---

## 2. Localised fields

Any human-readable field is an object keyed by language code, never a string:

```json
{ "title": { "ar": "أسس حل المشكلات", "en": "Foundations of Problem Solving" } }
```

Supported keys are `ar`, `en`, `nl`. **Not every key is always present.** Resolve
with a fallback chain rather than indexing directly:

```js
const text = (v, lang) =>
  typeof v === 'string' ? v : (v?.[lang] ?? v?.en ?? v?.ar ?? v?.nl ?? '')
```

Send the same shape back on write. Sending a bare string where an object is
expected is the single most common integration error against this API.

---

## 3. Errors — read this before wiring error handling

Validation failures are `422` and carry the actionable text in `errors`, not in
`message`. The top-level `message` is only the first error plus "(and N more
errors)", and the ones it drops are usually the ones that tell you what to fix.

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "program": [
      "PROGRAMME_AUTHORING_NOT_GOVERNANCE_READY: no approved competency mappings and no active learning outcomes."
    ]
  }
}
```

Governance refusals are deliberately machine-readable: the string starts with a
stable `SCREAMING_SNAKE_CASE` code you can branch on. The codes you will meet:

| Code | Meaning |
| --- | --- |
| `PROGRAMME_AUTHORING_NOT_GOVERNANCE_READY` | No approved competency mappings or no active learning outcomes |
| `GENERATION_NOT_AUTHORIZED` | No generation authorization recorded for this package version |
| `GENERATION_AUTHORIZATION_ALREADY_USED` | That authorization was already spent on a run |
| `GENERATION_TWO_PERSON_REQUIRED` | The granter may not also run it (see §6) |
| `DRAFT_ALREADY_EXISTS` | A draft exists for this version; open a new version instead |
| `AI_MODEL_IDENTITY_MISMATCH` | The provider answered with a different model than requested |

Flatten and show every entry in `errors`. A single generic sentence in place of
these loses the only information the user can act on.

---

## 4. Seed pack — a course becomes governable

**New.** A programme cannot be AI-authored until it has approved competency
mappings and active learning outcomes. Entering those by hand is what blocked
every course. Gemini now drafts them and a person approves them, in two calls
that are deliberately separate.

### `POST /admin/programs/{id}/seed-pack/propose`

Permission `programs.manage`. **Writes nothing.** Returns a draft for review.

```json
{ "locale": "ar" }
```

Takes roughly 3–20 seconds — it waits on the model. **Set your client timeout to
at least 60s for this one call.** The rest of the API answers in milliseconds.

Response `data`:

| Field | Notes |
| --- | --- |
| `competencies[]` | `professional_competency_id`, `target_proficiency_level_id`, `entry_proficiency_level_id`, `is_primary`, `weight`, `rationale` |
| `learning_outcomes[]` | `code`, `title`, `description`, `professional_competency_id`, `assessment_methods[]` |
| `academic_identity` | the six fields — `knowledge`, `skills`, `professional_behaviours`, `abilities`, `performance_indicators`, `outcomes` |
| `dictionary[]` | the approved competencies, for rendering labels |
| `proficiency_levels[]` | the active ladder, for the target-level control |
| `model` | which model drafted it |
| `requires_approval` | always `true` |

Two of the six academic fields — `performance_indicators` and `outcomes` — are
**derived** from the governed competencies and learning outcomes, not written by
the model. Present them as editable but label them as derived; a reviewer
changing them is overriding a computation, not filling a blank.

The draft is **not persisted**. If the user refreshes before approving, it is
gone and must be re-proposed. Keep it in component state.

### `POST /admin/programs/{id}/seed-pack/approve`

Permission `programs.manage`. This is the accountable act — it writes.

```json
{
  "competencies": [
    { "professional_competency_id": 21, "target_proficiency_level_id": 2,
      "is_primary": true, "weight": 0.5 }
  ],
  "learning_outcomes": [
    { "code": "LO-001", "title": { "ar": "…" }, "description": { "ar": "…" },
      "professional_competency_id": 21, "assessment_methods": ["practical_task"] }
  ],
  "academic_identity": {
    "knowledge": { "ar": "…" }, "skills": { "ar": "…" },
    "professional_behaviours": { "ar": "…" }, "abilities": { "ar": "…" },
    "performance_indicators": { "ar": "…" }, "outcomes": { "ar": "…" }
  }
}
```

Send the full edited draft back. Behaviour worth knowing:

- Competency ids are **re-validated** against the approved dictionary. An id
  that is not approved is rejected, not created.
- `target_proficiency_level_id` is **required per mapping** — the pivot column is
  NOT NULL and a mapping without it states no standard.
- An academic field you omit **keeps its existing value**. Omission means "no
  opinion", never "blank it".
- An outcome whose title already exists on the programme is **skipped**, so
  re-approving to fix one field does not double the outcomes.
- A programme that is already governed may be approved with `competencies: []`
  and `learning_outcomes: []` to write **only** the academic fields.

Returns `{ competencies: n, outcomes: n }` — `outcomes` counts what was actually
written, which may be fewer than you sent.

---

## 5. Package generation gates

### `GET /admin/programs/{id}/ai-package`

Permission `programs.manage`. Existing endpoint, **new `governance` block**:

```json
{
  "governance": {
    "ready": true,
    "approved_competency_mappings": 3,
    "active_learning_outcomes": 8,
    "authorized": false,
    "active_authorization": null,
    "latest_authorization": {
      "id": 5, "status": "consumed", "package_version": "1.0",
      "note": "Reviewed and ready.", "authorized_at": "2026-08-03T18:12:00+00:00",
      "consumed_at": "2026-08-03T18:20:00+00:00", "authorized_by": "Zaid Alkhatib"
    }
  }
}
```

Use it to say *which* gate is closed. `ready: false` means the seed pack is
missing; `authorized: false` means it needs an authorization. Do not infer either
from a failed generate call.

### `POST /admin/programs/{id}/authorize-generation`

Permission `rpl.settings.manage` (governance tier, deliberately different from
`programs.manage`).

```json
{ "note": "Reviewer approved v1.0 for authoring." }
```

Version-scoped, idempotent while unspent, and consumed by the run it permits.
`note` is optional server-side; the CMS requires ~10 characters because an
authorization with no recorded reason is indistinguishable later from an
accident.

---

## 6. Two-person control

Whoever authorizes a generation may not also run it — `GENERATION_TWO_PERSON_REQUIRED`.

This deployment has the control **relaxed** (`GOVERNANCE_TWO_PERSON_GENERATION=false`)
by owner decision, because a single-operator institute cannot staff it. It is
still recorded: every consumption writes `two_person_control` as `enforced` or
`waived_by_configuration`, plus `self_authorized`. Do not build UI that implies
two people reviewed something when the trail says otherwise.

---

## 7. Question bank — one bank per course

### `GET /admin/programs/{id}/question-bank`

**New.** Permission `learning.manage`. Every question in the course, flat.

Questions are *stored* one quiz per unit (`quizzes.course_section_id` is unique
and not-null), but the exam engine already selects across the whole programme.
This endpoint presents it the way it behaves: the unit is a **field on each
question**, not a container around it.

```json
{
  "data": {
    "program_id": 201,
    "total": 30,
    "by_review_status": { "approved": 30 },
    "by_difficulty": { "intermediate": 14, "advanced": 11, "foundational": 5 },
    "by_cognitive_demand": { "APPLY": 12, "ANALYZE": 10, "EVALUATE": 8 },
    "by_unit": { "12": 10, "13": 10, "14": 10 },
    "units": [{ "id": 12, "title": { "ar": "…" } }],
    "questions": [
      {
        "id": 481,
        "question_text": { "ar": "…" },
        "format": "MCQ_SINGLE",
        "context": "SCENARIO_BASED",
        "cognitive_demand": "APPLY",
        "difficulty": "intermediate",
        "review_status": "approved",
        "answer_rationale": { "ar": "…" },
        "unit_id": 12,
        "unit_title": { "ar": "…" },
        "learning_outcome_code": "LO-003",
        "options": [{ "id": 1, "text": { "ar": "…" }, "is_correct": true, "sort_order": 1 }]
      }
    ]
  }
}
```

`by_unit` is keyed by **unit id**, not title — titles are localised objects and
cannot be object keys. Resolve names through `units`.

Use the server's counts. Deriving "how many are approved" client-side will
eventually disagree with the publication gates, and the disagreement is silent.

Every question is `MCQ_SINGLE` with exactly one correct option. That is a
platform-wide standard, not a coincidence of the current data.

---

## 8. Course content tree

### `GET /admin/programs/{id}/content-tree`

**New.** Permission `learning.manage`. A course's whole structure in one call.

```json
{
  "data": {
    "program_id": 201,
    "official_code": "CGP-DGT-008",
    "content_status": "draft",
    "totals": { "units": 3, "lessons": 9, "activities": 9, "questions": 30 },
    "units": [
      {
        "id": 12,
        "title": { "ar": "…" },
        "description": { "ar": "…" },
        "sort_order": 1,
        "lesson_count": 3,
        "activity_count": 3,
        "quiz_id": 19,
        "question_count": 10,
        "lessons": [
          {
            "id": 88,
            "title": { "ar": "…" },
            "type": "text",
            "sort_order": 1,
            "body_length": 6573,
            "video_url": null,
            "activities": [
              { "id": 4, "title": { "ar": "…" }, "instructions": { "ar": "…" },
                "max_score": 100, "pass_score": 60, "is_active": true }
            ]
          }
        ]
      }
    ]
  }
}
```

`body_length` is the character count of the lesson body, not the body itself —
the tree is for navigating. It is a review signal: under ~800 characters a
"lesson" is usually too thin to be one.

Every node carries the id its editor needs, so this navigates to existing
screens rather than duplicating them.

### `PUT /admin/activities/{id}`

**New.** Permission `learning.manage`. Activities previously had **no read or
write path at all** — the generator created them and nothing could open one.

```json
{
  "title": { "ar": "…" },
  "instructions": { "ar": "…" },
  "max_score": 100,
  "pass_score": 70
}
```

All fields optional. A `pass_score` above `max_score` is refused with `422`,
checked against the values **as they will be saved** — so lowering `max_score`
alone cannot strand an existing pass score above it.

---

## 9. Behaviour that will surprise you

**Generation is slow and asynchronous.** `POST /admin/programs/{id}/ai-package`
returns `202` immediately; the work happens on a queue. Poll
`GET /admin/programs/{id}/ai-package` for `progress` and `ai_authoring_status`.
Question banks are now 100–300 items **per unit**, so a full run can take tens of
minutes. Do not show a spinner that implies seconds.

**A bank may stop short of its target.** When the model runs out of genuinely
distinct questions the run stops rather than padding, and records
`stopped_short`. Fewer questions than expected is a deliberate outcome, not a
failure.

**Nothing AI-generated is approved or published.** Drafts land as `ai_draft` and
require human review, then a blueprint, then publication. `ai_authoring_status`
and `content_status` are different fields and both matter.

---

## Complete endpoint index

Generated from `php artisan route:list`, so it matches the deployed router exactly. **374** endpoints under `/api/v1`. Rows marked **NEW** are the ones this handoff documents in detail above.


### Authentication & account (10)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/account/mfa/disable` | token | `—` | — |
| `POST` | `/api/v1/account/mfa/enable` | token | `—` | — |
| `PUT` | `/api/v1/account/password` | token | `—` | — |
| `DELETE` | `/api/v1/account/sessions` | token | `—` | — |
| `GET` | `/api/v1/account/sessions` | token | `—` | — |
| `DELETE` | `/api/v1/account/sessions/{session}` | token | `—` | — |
| `POST` | `/api/v1/login` | public | `—` | throttle auth-login |
| `POST` | `/api/v1/login/mfa` | public | `—` | throttle auth-login |
| `POST` | `/api/v1/logout` | token | `—` | — |
| `POST` | `/api/v1/register` | public | `—` | throttle auth-register |

### Public catalogue (23)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/experts` | public | `—` | — |
| `GET` | `/api/v1/experts/{slug}` | public | `—` | — |
| `POST` | `/api/v1/experts/{slug}/consultations` | token | `—` | — |
| `GET` | `/api/v1/library` | public | `—` | — |
| `GET` | `/api/v1/library/categories` | public | `—` | — |
| `GET` | `/api/v1/library/{resource:slug}` | public | `—` | — |
| `GET` | `/api/v1/library/{resource:slug}/download` | public | `—` | throttle 60,1 |
| `GET` | `/api/v1/pages/{slug}` | public | `—` | — |
| `POST` | `/api/v1/pages/{slug}` | token | `content.manage` | throttle admin-write |
| `GET` | `/api/v1/pages/{slug}/preview` | public | `—` | — |
| `GET` | `/api/v1/programs` | public | `—` | — |
| `GET` | `/api/v1/programs/featured` | public | `—` | — |
| `POST` | `/api/v1/programs/{program:slug}/applications` | token | `—` | — |
| `GET` | `/api/v1/programs/{program}/discussions` | token | `—` | — |
| `POST` | `/api/v1/programs/{program}/discussions` | token | `—` | — |
| `GET` | `/api/v1/programs/{slug}` | public | `—` | — |
| `GET` | `/api/v1/programs/{slug}/final-quiz` | token | `—` | — |
| `GET` | `/api/v1/programs/{slug}/final-quiz/attempts` | token | `—` | — |
| `POST` | `/api/v1/programs/{slug}/final-quiz/start` | token | `—` | throttle quiz-submit |
| `POST` | `/api/v1/programs/{slug}/final-quiz/submit` | token | `—` | throttle quiz-submit |
| `POST` | `/api/v1/programs/{slug}/purchase` | token | `—` | throttle purchase |
| `GET` | `/api/v1/programs/{slug}/sections` | token | `—` | — |
| `GET` | `/api/v1/programs/{slug}/sections/{sectionId}` | token | `—` | — |

### Learner journey (12)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/assignments/{assignment}/submit` | token | `—` | — |
| `GET` | `/api/v1/certificates/verify/{token}` | public | `—` | throttle 60,1 |
| `GET` | `/api/v1/certificates/verify/{token}/qr` | public | `—` | throttle 60,1 |
| `POST` | `/api/v1/enrollments/{enrollmentId}/cancel` | token | `—` | — |
| `GET` | `/api/v1/lessons/{lessonId}` | token | `—` | — |
| `POST` | `/api/v1/lessons/{lessonId}/complete` | token | `—` | — |
| `GET` | `/api/v1/lessons/{lessonId}/resources` | token | `—` | — |
| `GET` | `/api/v1/notifications` | token | `—` | — |
| `POST` | `/api/v1/notifications/read-all` | token | `—` | — |
| `POST` | `/api/v1/notifications/{notificationId}/read` | token | `—` | — |
| `GET` | `/api/v1/wallet` | token | `—` | — |
| `GET` | `/api/v1/wallet/transactions` | token | `—` | — |

### RPL — applicant (20)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/rpl/applications` | token | `—` | — |
| `POST` | `/api/v1/rpl/applications` | token | `—` | — |
| `GET` | `/api/v1/rpl/applications/{application}` | token | `—` | — |
| `PUT` | `/api/v1/rpl/applications/{application}` | token | `—` | — |
| `POST` | `/api/v1/rpl/applications/{application}/appeals` | token | `—` | — |
| `POST` | `/api/v1/rpl/applications/{application}/consent` | token | `—` | — |
| `POST` | `/api/v1/rpl/applications/{application}/evidence` | token | `—` | — |
| `GET` | `/api/v1/rpl/applications/{application}/information-requests` | token | `—` | — |
| `POST` | `/api/v1/rpl/applications/{application}/submit` | token | `—` | — |
| `GET` | `/api/v1/rpl/applications/{application}/timeline` | token | `—` | — |
| `GET` | `/api/v1/rpl/assessments` | token | `—` | — |
| `POST` | `/api/v1/rpl/assessments/{verification}/answers` | token | `—` | — |
| `GET` | `/api/v1/rpl/assessments/{verification}/delivery` | token | `—` | — |
| `POST` | `/api/v1/rpl/assessments/{verification}/open` | token | `—` | — |
| `DELETE` | `/api/v1/rpl/evidence/{evidence}` | token | `—` | — |
| `PUT` | `/api/v1/rpl/evidence/{evidence}` | token | `—` | — |
| `GET` | `/api/v1/rpl/evidence/{evidence}/history` | token | `—` | — |
| `POST` | `/api/v1/rpl/evidence/{evidence}/signed-url` | token | `—` | — |
| `POST` | `/api/v1/rpl/information-requests/{informationRequest}/respond` | token | `—` | — |
| `GET` | `/api/v1/rpl/reference-data` | token | `—` | — |

### Admin — programmes & packages (34)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/admin/categories` | token | `programs.manage` | — |
| `POST` | `/api/v1/admin/categories` | token | `programs.manage` | — |
| `DELETE` | `/api/v1/admin/categories/{category}` | token | `programs.manage` | — |
| `GET` | `/api/v1/admin/categories/{category}` | token | `programs.manage` | — |
| `PUT|PATCH` | `/api/v1/admin/categories/{category}` | token | `programs.manage` | — |
| `GET` | `/api/v1/admin/programs` | token | `programs.manage` | — |
| `POST` | `/api/v1/admin/programs` | token | `programs.manage` | — |
| `DELETE` | `/api/v1/admin/programs/{id}/ai-package` | token | `programs.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/programs/{id}/ai-package` | token | `programs.manage` | — |
| `POST` | `/api/v1/admin/programs/{id}/ai-package` | token | `programs.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/ai-package/regenerate` | token | `programs.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/ai-package/resolve-source` | token | `programs.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/programs/{id}/assessment-blueprint` | token | `programs.manage` | package must be editable, throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/assessment-blueprint/approve` | token | `programs.manage` | package must be editable, throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/authorize-generation` | token | `rpl.settings.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/programs/{id}/content-tree` **NEW** | token | `learning.manage` | — |
| `PUT` | `/api/v1/admin/programs/{id}/learning-time` | token | `programs.manage` | package must be editable, throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/learning-time/approve` | token | `programs.manage` | package must be editable, throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/new-version` | token | `programs.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/programs/{id}/package-pdf` | token | `programs.manage` | — |
| `POST` | `/api/v1/admin/programs/{id}/publish-package` | token | `programs.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/programs/{id}/question-bank` **NEW** | token | `learning.manage` | — |
| `POST` | `/api/v1/admin/programs/{id}/revoke-generation-authorization` | token | `rpl.settings.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/seed-pack/approve` **NEW** | token | `programs.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/seed-pack/propose` **NEW** | token | `programs.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/programs/{id}/toggle-active` | token | `programs.manage` | — |
| `DELETE` | `/api/v1/admin/programs/{program}` | token | `programs.manage` | — |
| `GET` | `/api/v1/admin/programs/{program}` | token | `programs.manage` | — |
| `PUT|PATCH` | `/api/v1/admin/programs/{program}` | token | `programs.manage` | — |
| `GET` | `/api/v1/admin/programs/{program}/competencies` | token | `programs.manage` | — |
| `PUT` | `/api/v1/admin/programs/{program}/competencies` | token | `programs.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/programs/{program}/eligibility` | token | `programs.manage` | — |
| `PUT` | `/api/v1/admin/programs/{program}/eligibility` | token | `programs.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/programs/{program}/eligibility/evaluate` | token | `programs.manage` | — |

### Admin — learning content (22)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `PUT` | `/api/v1/admin/activities/{id}` **NEW** | token | `learning.manage` | package must be editable, throttle admin-write |
| `GET` | `/api/v1/admin/lessons` | token | `learning.manage` | package must be editable |
| `POST` | `/api/v1/admin/lessons` | token | `learning.manage` | package must be editable |
| `DELETE` | `/api/v1/admin/lessons/{lesson}` | token | `learning.manage` | package must be editable |
| `GET` | `/api/v1/admin/lessons/{lesson}` | token | `learning.manage` | package must be editable |
| `PUT|PATCH` | `/api/v1/admin/lessons/{lesson}` | token | `learning.manage` | package must be editable |
| `POST` | `/api/v1/admin/quiz-questions/{id}/approve` | token | `programs.manage` | package must be editable, throttle admin-write |
| `GET` | `/api/v1/admin/quiz-questions/{id}/outcomes` | token | `programs.manage` | — |
| `POST` | `/api/v1/admin/quiz-questions/{id}/reject` | token | `programs.manage` | package must be editable, throttle admin-write |
| `PUT` | `/api/v1/admin/quiz-questions/{id}/review` | token | `programs.manage` | package must be editable, throttle admin-write |
| `GET` | `/api/v1/admin/quizzes` | token | `learning.manage` | — |
| `POST` | `/api/v1/admin/quizzes` | token | `learning.manage` | — |
| `POST` | `/api/v1/admin/quizzes/import-pdf` | token | `learning.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/quizzes/imports/{aiQuizImport}` | token | `learning.manage` | — |
| `DELETE` | `/api/v1/admin/quizzes/{quiz}` | token | `learning.manage` | — |
| `GET` | `/api/v1/admin/quizzes/{quiz}` | token | `learning.manage` | — |
| `PUT|PATCH` | `/api/v1/admin/quizzes/{quiz}` | token | `learning.manage` | — |
| `GET` | `/api/v1/admin/sections` | token | `learning.manage` | package must be editable |
| `POST` | `/api/v1/admin/sections` | token | `learning.manage` | package must be editable |
| `DELETE` | `/api/v1/admin/sections/{section}` | token | `learning.manage` | package must be editable |
| `GET` | `/api/v1/admin/sections/{section}` | token | `learning.manage` | package must be editable |
| `PUT|PATCH` | `/api/v1/admin/sections/{section}` | token | `learning.manage` | package must be editable |

### Admin — RPL (78)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/admin/rpl/ai-advisories/{advisory}/acknowledge` | token | `rpl.applications.manage` | — |
| `GET` | `/api/v1/admin/rpl/ai-advisories/{advisory}/export` | token | `rpl.applications.view` | — |
| `GET` | `/api/v1/admin/rpl/appeals` | token | `rpl.appeals.review` | — |
| `PUT` | `/api/v1/admin/rpl/appeals/{appeal}` | token | `rpl.appeals.manage` | — |
| `POST` | `/api/v1/admin/rpl/appeals/{appeal}/decision` | token | `rpl.appeals.review` | — |
| `GET` | `/api/v1/admin/rpl/applications` | token | `rpl.applications.view` | — |
| `POST` | `/api/v1/admin/rpl/applications` | token | `rpl.applications.manage` | — |
| `GET` | `/api/v1/admin/rpl/applications/{application}` | token | `rpl.applications.view` | — |
| `PUT` | `/api/v1/admin/rpl/applications/{application}` | token | `rpl.applications.manage` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/admin-assessment` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/applications/{application}/assignments` | token | `rpl.assignments.manage` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/committee-decision` | token | `rpl.committee.decide` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/consent` | token | `rpl.applications.manage` | — |
| `GET` | `/api/v1/admin/rpl/applications/{application}/declaration` | token | `rpl.applications.view` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/evidence` | token | `rpl.evidence.upload` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/initial-review` | token | `rpl.applications.manage` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/payment-reconciliation` | token | `rpl.payments.reconcile` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/applications/{application}/quality-review` | token | `rpl.quality.approve` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/requests` | token | `rpl.applications.manage` | — |
| `GET` | `/api/v1/admin/rpl/applications/{application}/timeline` | token | `rpl.applications.view` | — |
| `POST` | `/api/v1/admin/rpl/applications/{application}/transition` | token | `rpl.applications.manage` | — |
| `GET` | `/api/v1/admin/rpl/assessments` | token | `rpl.applications.view` | — |
| `GET` | `/api/v1/admin/rpl/assessments/{assessment}` | token | `rpl.applications.view` | — |
| `POST` | `/api/v1/admin/rpl/assessments/{assessment}/ai-advisories` | token | `rpl.applications.manage` | — |
| `PUT` | `/api/v1/admin/rpl/assessments/{assessment}/completion-plan` | token | `rpl.assessments.perform` | — |
| `PUT` | `/api/v1/admin/rpl/assessments/{assessment}/findings` | token | `rpl.assessments.perform` | — |
| `PUT` | `/api/v1/admin/rpl/assessments/{assessment}/gap-analysis` | token | `rpl.assessments.perform` | — |
| `POST` | `/api/v1/admin/rpl/assessments/{assessment}/interviews` | token | `rpl.assessments.perform` | — |
| `POST` | `/api/v1/admin/rpl/assessments/{assessment}/submit-report` | token | `rpl.reports.submit` | — |
| `GET` | `/api/v1/admin/rpl/assessors` | token | `rpl.assignments.manage` | — |
| `GET` | `/api/v1/admin/rpl/assignments` | token | `rpl.applications.view` | — |
| `DELETE` | `/api/v1/admin/rpl/assignments/{assignment}` | token | `rpl.assignments.manage` | — |
| `POST` | `/api/v1/admin/rpl/assignments/{assignment}/accept` | token | `rpl.assessments.perform` | — |
| `POST` | `/api/v1/admin/rpl/assignments/{assignment}/conflict-declaration` | token | `rpl.assessments.perform` | — |
| `POST` | `/api/v1/admin/rpl/assignments/{assignment}/start` | token | `rpl.assessments.perform` | — |
| `GET` | `/api/v1/admin/rpl/committee/cases` | token | `rpl.committee.decide` | — |
| `POST` | `/api/v1/admin/rpl/committee/reviews/{review}/votes` | token | `rpl.committee.decide` | — |
| `GET` | `/api/v1/admin/rpl/dashboard` | token | `rpl.applications.view` | — |
| `GET` | `/api/v1/admin/rpl/decision-policies` | token | `rpl.settings.manage` | — |
| `POST` | `/api/v1/admin/rpl/decision-policies` | token | `rpl.settings.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/decision-policies/{id}/approve` | token | `rpl.settings.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/rpl/dynamic-assessments` | token | `rpl.applications.manage` | — |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/from-assessment/{assessment}` | token | `rpl.applications.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/rpl/dynamic-assessments/items/{item}` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/items/{item}/approve` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/items/{item}/regenerate` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/items/{item}/reject` | token | `rpl.applications.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/rpl/dynamic-assessments/{verification}` | token | `rpl.applications.manage` | — |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/{verification}/approve-all` | token | `rpl.applications.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/rpl/dynamic-assessments/{verification}/export` | token | `rpl.applications.manage` | — |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/{verification}/final-evaluation` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/{verification}/generate` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/{verification}/items` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/{verification}/reorder` | token | `rpl.applications.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/dynamic-assessments/{verification}/send` | token | `rpl.applications.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/rpl/evidence` | token | `rpl.evidence.view` | — |
| `DELETE` | `/api/v1/admin/rpl/evidence/{evidence}` | token | `rpl.applications.manage` | — |
| `GET` | `/api/v1/admin/rpl/evidence/{evidence}` | token | `rpl.evidence.view` | — |
| `PUT` | `/api/v1/admin/rpl/evidence/{evidence}` | token | `rpl.evidence.correct` | — |
| `GET` | `/api/v1/admin/rpl/evidence/{evidence}/history` | token | `rpl.evidence.view` | — |
| `POST` | `/api/v1/admin/rpl/evidence/{evidence}/review` | token | `rpl.evidence.review` | — |
| `POST` | `/api/v1/admin/rpl/evidence/{evidence}/signed-url` | token | `rpl.evidence.view` | — |
| `POST` | `/api/v1/admin/rpl/gap-items/{gapItem}/targeted-reassessment` | token | `rpl.assessments.perform` | throttle admin-write |
| `PUT` | `/api/v1/admin/rpl/interviews/{interview}` | token | `rpl.assessments.perform` | — |
| `GET` | `/api/v1/admin/rpl/quality/reviews` | token | `rpl.quality.approve` | — |
| `GET` | `/api/v1/admin/rpl/reference-data` | token | `rpl.applications.view` | — |
| `POST` | `/api/v1/admin/rpl/requests/{informationRequest}/close` | token | `rpl.applications.manage` | — |
| `GET` | `/api/v1/admin/rpl/settings` | token | `rpl.settings.manage` | — |
| `PUT` | `/api/v1/admin/rpl/settings` | token | `rpl.settings.manage` | — |
| `GET` | `/api/v1/admin/rpl/source-of-truth` | token | `rpl.settings.manage` | — |
| `GET` | `/api/v1/admin/rpl/targeted-reassessments/{id}` | token | `rpl.applications.view` | — |
| `POST` | `/api/v1/admin/rpl/targeted-reassessments/{id}/decision` | token | `rpl.assessments.perform` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/targeted-reassessments/{id}/evaluation` | token | `rpl.assessments.perform` | throttle admin-write |
| `POST` | `/api/v1/admin/rpl/targeted-reassessments/{id}/evidence` | token | `rpl.assessments.perform` | throttle admin-write |
| `GET` | `/api/v1/admin/rpl/{resource}` | token | `rpl.settings.manage` | — |
| `POST` | `/api/v1/admin/rpl/{resource}` | token | `rpl.settings.manage` | — |
| `DELETE` | `/api/v1/admin/rpl/{resource}/{record}` | token | `rpl.settings.manage` | — |
| `PUT` | `/api/v1/admin/rpl/{resource}/{record}` | token | `rpl.settings.manage` | — |

### Admin — users & access (17)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/admin/experts` | token | `experts.view` | — |
| `GET` | `/api/v1/admin/experts/{expert}` | token | `experts.view` | — |
| `PUT` | `/api/v1/admin/experts/{expert}` | token | `experts.manage` | — |
| `POST` | `/api/v1/admin/experts/{expert}/programs` | token | `experts.manage` | — |
| `PUT` | `/api/v1/admin/experts/{expert}/review` | token | `experts.review` | — |
| `GET` | `/api/v1/admin/permissions` | token | `roles.manage` | — |
| `GET` | `/api/v1/admin/roles` | token | `roles.manage` | — |
| `GET` | `/api/v1/admin/users` | token | `users.view` | — |
| `POST` | `/api/v1/admin/users` | token | `users.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/users/{id}` | token | `users.view` | — |
| `PUT` | `/api/v1/admin/users/{user}` | token | `users.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/users/{user}/enrollments` | token | `users.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/users/{user}/professional-qualification-eligibility` | token | `users.view` | — |
| `POST` | `/api/v1/admin/users/{user}/qualifications` | token | `users.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/users/{user}/qualifications/{qualification}` | token | `users.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/users/{user}/qualifications/{qualification}` | token | `users.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/users/{user}/roles` | token | `roles.manage` | — |

### Admin — governance & operations (29)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/admin/audit-logs` | token | `audit.view` | — |
| `GET` | `/api/v1/admin/finance/coupons` | token | `finance.catalog.manage` | — |
| `POST` | `/api/v1/admin/finance/coupons` | token | `finance.catalog.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/finance/coupons/{coupon}` | token | `finance.catalog.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/finance/dashboard` | token | `finance.reports.view` | — |
| `GET` | `/api/v1/admin/finance/products` | token | `finance.catalog.manage` | — |
| `POST` | `/api/v1/admin/finance/products` | token | `finance.catalog.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/finance/products/{product}` | token | `finance.catalog.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/finance/products/{product}/prices` | token | `finance.catalog.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/finance/products/{product}/prices/{price}` | token | `finance.catalog.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/finance/subscriptions` | token | `finance.catalog.manage` | — |
| `PUT` | `/api/v1/admin/finance/subscriptions/{subscription}` | token | `finance.catalog.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/support/announcements` | token | `support.manage` | — |
| `POST` | `/api/v1/admin/support/announcements` | token | `support.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/support/announcements/{announcement}` | token | `support.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/support/announcements/{announcement}` | token | `support.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/support/dashboard` | token | `support.manage` | — |
| `GET` | `/api/v1/admin/support/faq-categories` | token | `support.manage` | — |
| `POST` | `/api/v1/admin/support/faq-categories` | token | `support.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/support/faq-categories/{category}` | token | `support.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/support/faq-categories/{category}` | token | `support.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/support/faqs` | token | `support.manage` | — |
| `POST` | `/api/v1/admin/support/faqs` | token | `support.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/support/faqs/{faq}` | token | `support.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/support/faqs/{faq}` | token | `support.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/support/tickets` | token | `support.manage` | — |
| `GET` | `/api/v1/admin/support/tickets/{ticket}` | token | `support.manage` | — |
| `PUT` | `/api/v1/admin/support/tickets/{ticket}` | token | `support.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/support/tickets/{ticket}/messages` | token | `support.manage` | throttle admin-write |

### Admin — other (63)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/admin/ai/quiz-settings` | token | `learning.manage` | — |
| `PUT` | `/api/v1/admin/ai/quiz-settings` | token | `learning.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/applications` | token | `applications.review` | — |
| `PUT` | `/api/v1/admin/applications/{application}` | token | `applications.review` | — |
| `POST` | `/api/v1/admin/assignments` | token | `learning.manage` | — |
| `GET` | `/api/v1/admin/assignments/{assignment}/submissions` | token | `assignments.grade` | — |
| `GET` | `/api/v1/admin/certificate-templates` | token | `certificate_templates.manage` | — |
| `POST` | `/api/v1/admin/certificate-templates` | token | `certificate_templates.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/certificate-templates/{template}` | token | `certificate_templates.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/certificates` | token | `certificates.view` | — |
| `POST` | `/api/v1/admin/certificates` | token | `certificates.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/certificates/{certificate}` | token | `certificates.view` | — |
| `POST` | `/api/v1/admin/certificates/{certificate}/reissue` | token | `certificates.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/certificates/{certificate}/revoke` | token | `certificates.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/competency-framework` | token | `programs.manage` | — |
| `POST` | `/api/v1/admin/competency-gap-groups` | token | `programs.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/competency-gap-groups/{group}` | token | `programs.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/competency-gap-groups/{group}` | token | `programs.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/consultations` | token | `consultations.manage` | — |
| `PUT` | `/api/v1/admin/consultations/{consultation}/assign` | token | `consultations.manage` | — |
| `GET` | `/api/v1/admin/cpd` | token | `cpd.review` | — |
| `PUT` | `/api/v1/admin/cpd/{cpdEntry}/review` | token | `cpd.review` | — |
| `DELETE` | `/api/v1/admin/discussion-posts/{post}` | token | `discussions.moderate` | — |
| `PUT` | `/api/v1/admin/discussions/{thread}` | token | `discussions.moderate` | — |
| `GET` | `/api/v1/admin/enrollments` | token | `users.view` | — |
| `POST` | `/api/v1/admin/enrollments/{enrollment}/refund` | token | `finance.manage` | — |
| `DELETE` | `/api/v1/admin/expert-programs/{assignment}` | token | `experts.manage` | — |
| `GET` | `/api/v1/admin/expertise-categories` | token | `experts.manage` | — |
| `POST` | `/api/v1/admin/expertise-categories` | token | `experts.manage` | — |
| `DELETE` | `/api/v1/admin/expertise-categories/{expertise_category}` | token | `experts.manage` | — |
| `GET` | `/api/v1/admin/expertise-categories/{expertise_category}` | token | `experts.manage` | — |
| `PUT|PATCH` | `/api/v1/admin/expertise-categories/{expertise_category}` | token | `experts.manage` | — |
| `GET` | `/api/v1/admin/library/categories` | token | `library.manage` | — |
| `POST` | `/api/v1/admin/library/categories` | token | `library.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/library/categories/{category}` | token | `library.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/library/categories/{category}` | token | `library.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/library/resources` | token | `library.manage` | — |
| `POST` | `/api/v1/admin/library/resources` | token | `library.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/library/resources/{resource}` | token | `library.manage` | — |
| `PUT` | `/api/v1/admin/library/resources/{resource}` | token | `library.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/library/resources/{resource}/archive` | token | `library.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/library/resources/{resource}/versions` | token | `library.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/library/resources/{resource}/versions/{version}/publish` | token | `library.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/menu-items/{item}` | token | `content.manage` | — |
| `PUT` | `/api/v1/admin/menu-items/{item}` | token | `content.manage` | — |
| `GET` | `/api/v1/admin/menus` | token | `content.manage` | — |
| `POST` | `/api/v1/admin/menus` | token | `content.manage` | — |
| `POST` | `/api/v1/admin/menus/{menu}/items` | token | `content.manage` | — |
| `DELETE` | `/api/v1/admin/page-sections/{section}` | token | `content.manage` | — |
| `PUT` | `/api/v1/admin/page-sections/{section}` | token | `content.manage` | — |
| `GET` | `/api/v1/admin/pages` | token | `content.manage` | — |
| `POST` | `/api/v1/admin/pages/{page}/sections` | token | `content.manage` | — |
| `POST` | `/api/v1/admin/pages/{slug}` | token | `content.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/professional-competencies` | token | `programs.manage` | throttle admin-write |
| `DELETE` | `/api/v1/admin/professional-competencies/{competency}` | token | `programs.manage` | throttle admin-write |
| `PUT` | `/api/v1/admin/professional-competencies/{competency}` | token | `programs.manage` | throttle admin-write |
| `GET` | `/api/v1/admin/release` | token | `audit.view` | — |
| `POST` | `/api/v1/admin/resources` | token | `learning.manage` | — |
| `DELETE` | `/api/v1/admin/resources/{resource}` | token | `learning.manage` | — |
| `PUT` | `/api/v1/admin/resources/{resource}` | token | `learning.manage` | — |
| `PUT` | `/api/v1/admin/submissions/{submission}/grade` | token | `assignments.grade` | — |
| `POST` | `/api/v1/admin/wallets/{userId}/credit` | token | `finance.manage` | throttle admin-write |
| `POST` | `/api/v1/admin/wallets/{userId}/debit` | token | `finance.manage` | throttle admin-write |

### Other (66)

| Method | Endpoint | Auth | Permission | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/competency-gap-library` | public | `—` | — |
| `GET` | `/api/v1/conversations` | token | `—` | — |
| `POST` | `/api/v1/conversations` | token | `—` | — |
| `GET` | `/api/v1/conversations/{conversation}` | token | `—` | — |
| `POST` | `/api/v1/conversations/{conversation}/leave` | token | `—` | — |
| `POST` | `/api/v1/conversations/{conversation}/messages` | token | `—` | — |
| `GET` | `/api/v1/cpd` | token | `—` | — |
| `POST` | `/api/v1/cpd` | token | `—` | — |
| `DELETE` | `/api/v1/cpd/{cpdEntry}` | token | `—` | — |
| `PUT|PATCH` | `/api/v1/cpd/{cpdEntry}` | token | `—` | — |
| `GET` | `/api/v1/dashboard` | token | `—` | — |
| `POST` | `/api/v1/discussions/{thread}/posts` | token | `—` | — |
| `PUT` | `/api/v1/expert/availability` | token | `—` | — |
| `GET` | `/api/v1/expert/consultations` | token | `—` | — |
| `PUT` | `/api/v1/expert/consultations/{consultation}` | token | `—` | — |
| `PUT` | `/api/v1/expert/expertise` | token | `—` | — |
| `GET` | `/api/v1/expert/profile` | token | `—` | — |
| `PUT` | `/api/v1/expert/profile` | token | `—` | — |
| `POST` | `/api/v1/expert/profile/submit` | token | `—` | — |
| `GET` | `/api/v1/expertise-categories` | public | `—` | — |
| `GET` | `/api/v1/finance/catalog` | public | `—` | — |
| `GET` | `/api/v1/finance/catalog/{code}` | public | `—` | — |
| `POST` | `/api/v1/finance/catalog/{code}/quote` | public | `—` | throttle 60,1 |
| `POST` | `/api/v1/forgot-password` | public | `—` | throttle password-reset-request |
| `POST` | `/api/v1/media` | token | `—` | — |
| `DELETE` | `/api/v1/media/{media}` | token | `—` | — |
| `GET` | `/api/v1/media/{media}` | public | `—` | — |
| `POST` | `/api/v1/media/{media}/signed-url` | token | `—` | — |
| `GET` | `/api/v1/my/applications` | token | `—` | — |
| `GET` | `/api/v1/my/certificates` | token | `—` | — |
| `GET` | `/api/v1/my/certificates/{certificate}/download` | token | `—` | — |
| `GET` | `/api/v1/my/consultations` | token | `—` | — |
| `POST` | `/api/v1/my/consultations/{consultation}/cancel` | token | `—` | — |
| `GET` | `/api/v1/my/enrollments` | token | `—` | — |
| `GET` | `/api/v1/my/enrollments/{programSlug}` | token | `—` | — |
| `GET` | `/api/v1/my/enrollments/{programSlug}/progress` | token | `—` | — |
| `GET` | `/api/v1/my/library` | token | `—` | — |
| `GET` | `/api/v1/my/library/{resource:slug}` | token | `—` | — |
| `GET` | `/api/v1/my/library/{resource:slug}/download` | token | `—` | — |
| `GET` | `/api/v1/my/transcript` | token | `—` | — |
| `GET` | `/api/v1/navigation/{location}` | public | `—` | — |
| `POST` | `/api/v1/otp/resend` | public | `—` | throttle otp-resend |
| `POST` | `/api/v1/otp/verify` | public | `—` | throttle otp-verify |
| `GET` | `/api/v1/professional-competency-dictionary` | public | `—` | — |
| `GET` | `/api/v1/professional-qualifications/eligibility` | token | `—` | — |
| `GET` | `/api/v1/profile` | token | `—` | — |
| `POST` | `/api/v1/profile/experiences` | token | `—` | — |
| `DELETE` | `/api/v1/profile/experiences/{experience}` | token | `—` | — |
| `PUT` | `/api/v1/profile/experiences/{experience}` | token | `—` | — |
| `PUT` | `/api/v1/profile/personal` | token | `—` | — |
| `PUT` | `/api/v1/profile/professional` | token | `—` | — |
| `POST` | `/api/v1/profile/qualifications` | token | `—` | — |
| `DELETE` | `/api/v1/profile/qualifications/{qualification}` | token | `—` | — |
| `PUT` | `/api/v1/profile/qualifications/{qualification}` | token | `—` | — |
| `GET` | `/api/v1/program-access` | token | `—` | — |
| `POST` | `/api/v1/reset-password` | public | `—` | throttle password-reset-confirm |
| `POST` | `/api/v1/resources/{resource}/access` | token | `—` | — |
| `PUT` | `/api/v1/settings` | token | `—` | — |
| `GET` | `/api/v1/support/announcements` | public | `—` | — |
| `GET` | `/api/v1/support/faq-categories` | public | `—` | — |
| `GET` | `/api/v1/support/faqs` | public | `—` | — |
| `GET` | `/api/v1/support/tickets` | token | `—` | — |
| `POST` | `/api/v1/support/tickets` | token | `—` | — |
| `GET` | `/api/v1/support/tickets/{ticket}` | token | `—` | — |
| `POST` | `/api/v1/support/tickets/{ticket}/messages` | token | `—` | — |
| `GET` | `/api/v1/user` | token | `—` | — |

---

## Verification

Every endpoint in the index was read from `php artisan route:list` on the
current build, not transcribed — including the permission column, which is
extracted from the resolved middleware rather than typed. The examples in
sections 4-8 are the real response shapes returned by the controllers, and each
behaviour under section 9 has a test holding it in place.

Where the document and the API disagree, the API is right and this file is
stale. Regenerate the index rather than editing it by hand.

Questions to the backend maintainer rather than guessing — particularly around
the governance codes in section 3, where the safe default is to surface the
server's own text verbatim.
