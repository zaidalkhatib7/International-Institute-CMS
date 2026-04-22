# International Institute - Admin CMS API Updates for 2026-04-21

This document is a focused handoff for the **admin CMS developer**.

It includes only the admin-facing API changes introduced today.

---

## Summary

Today's admin-side changes are centered on the new quiz architecture:

- section quizzes are now treated as **question banks**
- programs now own the **final quiz title** and **final quiz pass percentage**
- each section bank controls how many questions it contributes to the generated final quiz using `questions_per_attempt`
- validation now enforces a safer question-bank structure

Security-related admin change:
- `POST /api/pages/{slug}` is now admin-only and rate-limited

---

## 1. Program Admin Payload Changes

The following admin endpoints now support final-quiz settings:

- `POST /api/admin/programs`
- `PUT /api/admin/programs/{id}`
- `GET /api/admin/programs`
- `GET /api/admin/programs/{id}`

### New Fields

- `final_quiz_title`
- `final_quiz_pass_percentage`

### Meaning

- `final_quiz_title`: learner-facing title for the generated final course quiz
- `final_quiz_pass_percentage`: pass threshold for the final quiz attempt

### Example Request

```json
{
  "category_id": 1,
  "title": { "en": "Strategic Leadership" },
  "short_description": { "en": "A concise leadership program." },
  "price_points": 500,
  "final_quiz_title": { "en": "Strategic Leadership Final Assessment" },
  "final_quiz_pass_percentage": 70,
  "is_active": true
}
```

### Validation Notes

- `final_quiz_title` is optional
- if `final_quiz_title` is sent, `final_quiz_title.en` is required
- `final_quiz_pass_percentage` must be an integer from `0` to `100`

---

## 2. Admin Quiz Endpoints Now Manage Section Question Banks

These endpoints still exist:

- `GET /api/admin/quizzes`
- `POST /api/admin/quizzes`
- `GET /api/admin/quizzes/{id}`
- `PUT /api/admin/quizzes/{id}`
- `DELETE /api/admin/quizzes/{id}`

But their role has changed:

- they no longer represent a fixed learner quiz taken at the end of a section
- they now represent the **question bank for a section**

---

## 3. New Question Bank Field

### `questions_per_attempt`

This is now required in create and update requests.

### Meaning

It defines:
- how many random questions from this section bank will be included in each generated final quiz attempt

### Example

If a section bank has:
- 10 questions total
- `questions_per_attempt = 3`

Then each learner final quiz attempt will include:
- 3 randomly selected questions from that section bank

---

## 4. Question Bank Create / Update Payload

### Create

```http
POST /api/admin/quizzes
Authorization: Bearer {{admin_token}}
```

### Update

```http
PUT /api/admin/quizzes/{id}
Authorization: Bearer {{admin_token}}
```

### Body Example

```json
{
  "section_id": 1,
  "title": { "en": "Foundations Question Bank" },
  "questions_per_attempt": 2,
  "questions": [
    {
      "id": 1,
      "question_text": { "en": "What is the capital of France?" },
      "options": [
        {
          "id": 1,
          "option_text": { "en": "Paris" },
          "is_correct": true
        },
        {
          "option_text": { "en": "London" },
          "is_correct": false
        }
      ]
    },
    {
      "question_text": { "en": "Which city is in Germany?" },
      "options": [
        {
          "option_text": { "en": "Berlin" },
          "is_correct": true
        },
        {
          "option_text": { "en": "Madrid" },
          "is_correct": false
        }
      ]
    }
  ]
}
```

---

## 5. Question Bank Validation Rules

The admin API now enforces:

- `section_id` is required on create
- one section can have only one question bank
- `questions_per_attempt` is required
- `questions_per_attempt >= 0`
- `questions_per_attempt` cannot exceed the number of questions in the bank
- each question must have at least 2 options
- each question must have **exactly one** correct option

### Validation Failure Example

If two options are marked correct for one question, the API returns `422`.

If `questions_per_attempt` is greater than the number of provided questions, the API returns `422`.

---

## 6. Full-Sync Update Behavior

`PUT /api/admin/quizzes/{id}` remains a **full-sync** update.

This means:

- omitted questions are deleted
- omitted options are deleted
- existing items must be included with their `id` if you want to preserve and update them

### Practical CMS Implication

The admin editor should send the full current bank state on save, not only partial deltas.

---

## 7. Sort Order Behavior

The admin quiz controller now sets sort order automatically during create/update:

- question order follows array order in the request
- option order follows array order in the request

### CMS Implication

If the UI supports drag-and-drop ordering:
- send questions in the desired order
- send options in the desired order

---

## 8. Section Deletion Rule

Section deletion still fails if the section contains content.

Now that means:

- lessons block deletion
- question banks also block deletion

So a section with a configured question bank cannot be deleted until that bank is removed.

---

## 9. Admin Page Update Security Change

### Endpoint

```http
POST /api/pages/{slug}
```

### New Behavior

- admin-only
- authenticated
- rate-limited

### Non-admin Response

Status: `403`

```json
{
  "message": "Unauthorized. Admin access required."
}
```

---

## 10. Recommended CMS UI Behavior

For the admin CMS, the frontend should assume:

- each section has at most one question bank
- the instructor edits the full bank in one screen/form
- the instructor sets `questions_per_attempt` per section
- the program editor sets:
  - `final_quiz_title`
  - `final_quiz_pass_percentage`

### Good CMS safeguards

- disable save if `questions_per_attempt > question_count`
- show a warning if a question does not have exactly one correct option
- show how many questions each section contributes to the final quiz
- show the total number of questions a learner final quiz attempt will contain

---

## 11. Current Seeded Example

For `strategic-leadership-short-course`:

| Section | Questions in Bank | questions_per_attempt |
|---|---:|---:|
| Foundations of Leadership | 3 | 2 |
| Communication & Influence | 2 | 1 |

So the generated final quiz contains:

- 3 questions total
- 2 drawn from section 1
- 1 drawn from section 2
- then shuffled before learner delivery

---

## 12. Endpoints Checklist

### Programs

- `GET /api/admin/programs`
- `GET /api/admin/programs/{id}`
- `POST /api/admin/programs`
- `PUT /api/admin/programs/{id}`

### Question Banks

- `GET /api/admin/quizzes`
- `GET /api/admin/quizzes/{id}`
- `POST /api/admin/quizzes`
- `PUT /api/admin/quizzes/{id}`
- `DELETE /api/admin/quizzes/{id}`

### Pages

- `POST /api/pages/{slug}` (admin-only)
