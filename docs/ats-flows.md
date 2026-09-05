# ATS application flow analysis

Status of each section: **R** = from documentation / prior knowledge, **L** =
confirmed against a live posting.

### Live verification log (2026)

| ATS | Posting inspected | Result |
| --- | --- | --- |
| Lever | `jobs.lever.co/levelai/.../apply` | **L** — all built-in field names confirmed (see adapter). |
| Greenhouse | `job-boards.greenhouse.io/anthropic/...` and `.../doordashusa/jobs/7983501` | **L** — React board keeps `#first_name`/`#last_name`/`#email`/`#phone`/`#country`, adds `#candidate-location`; education is React-Select `school--N`/`degree--N`/`discipline--N`/`start_date--N`/`end_date--N`; custom questions are `#question_<numeric>` by label. Employment section not seen on the checked postings. Classic `*_records_attributes_*` retained for old embedded forms — still **R**. |
| Ashby | `jobs.ashbyhq.com/level-ai/.../application` | **L** — `_systemfield_name`/`_systemfield_email`, `phone`, `currentCompany`, `currentLocation`, `LinkedIn`/`GitHub`/`Portfolio` confirmed. |
| Workday | `nvidia.wd5` + `barclays.wd3` `/applyManually` | **Partial** — step rail (Create Account/Sign In → My Information → My Experience → Application Questions → Voluntary Disclosures → Self Identify → Review) and `formField-<name>` + bare `data-automation-id` convention confirmed on both tenants. My Information / My Experience fields sit behind mandatory account creation — capture pending from a logged-in tenant (see the console snippet in the project chat / README). |

---

## Workday — `*.myworkdayjobs.com` (R)

**Shape:** React single-page app, multi-step wizard. Account creation is usually
required before the form appears.

**Steps (typical order):**
1. **My Information** — how you want to apply (Autofill with Resume / Apply
   Manually / Use My Last Application), source ("How did you hear about us"),
   previous employment with this company, legal name, address, email, phone.
2. **My Experience** — three repeatable sub-sections, each with its own *Add*
   button: **Work Experience** (job title, company, location, currently work
   here, from/to dates as month+year, role description), **Education** (school,
   degree, field of study, overall result / GPA, first & last year attended),
   **Skills**, **Websites/Social**, plus resume/attachment upload.
3. **Application Questions** — role-specific; right-to-work, visa sponsorship,
   notice period, etc.
4. **Voluntary Disclosures** — gender, ethnicity, disability (jurisdiction
   dependent); sometimes date of birth here.
5. **Self Identify** — disability form (US) / equivalent.
6. **Review** — read-only summary.
7. **Submit** → Confirmation.

**How fields are rendered:** every control carries `data-automation-id`. Text
inputs are normal `<input>`. Company / School / Country / Degree are **prompt
pickers** — a button that opens a listbox; you type to filter and must pick an
existing option (typed-but-unmatched values are rejected). Dates are split into
separate month and year inputs.

**Extension behaviour:** fills the current step only, never clicks *Next* or
*Submit*. Prompt-picker values that don't match an option are routed to review.

**Known automation ids** (see `adapters/workday.ts`): `legalNameSection_firstName`
/`_lastName`, `addressSection_addressLine1`/`_city`/`_postalCode`/`_countryRegion`,
`email`, `phone-number`, `dateOfBirth`, `workExperience-N-*`, `education-N-*`.
These vary by tenant Workday version — confirm per posting.

---

## Greenhouse — `boards.greenhouse.io`, `job-boards.greenhouse.io`, embedded `grnh.se` (R)

**Shape:** mostly a single long page. Two markups in the wild:

- **Classic board** (`boards.greenhouse.io`, and iframes on company sites):
  server-rendered form. Stable ids: `#first_name`, `#last_name`, `#email`,
  `#phone`. Education rows: `candidate_education_records_attributes_<n>_<field>`
  (`school_name_id`, `degree_id`, `discipline_id`, `start_date`, `end_date`).
  Employment rows: `candidate_employment_records_attributes_<n>_<field>`
  (`company_name`, `title`, `start_date`, `end_date`, `current`). "Add another"
  reveals more rows. Custom questions:
  `job_application_answers_attributes_<n>_...`.
- **New React board** (`job-boards.greenhouse.io`, now the default for new
  customers): inputs keyed `id^="question_"`, matched by `<label>` / `aria-label`.
  `<select>`-style fields render as listbox comboboxes.

**Steps (single page, in order):** resume/CV upload → personal info → education
(repeatable) → employment (repeatable) → additional questions → EEO/demographic
questions (voluntary) → submit.

**How fields are rendered:** plain inputs for personal info; **school** and
**country** are async autocompletes (type, then pick); education "degree" and
"discipline" are selects keyed by internal id.

**Extension behaviour:** classic ids are mapped directly; React-board and custom
questions fall to the label resolver. Demographic answers only filled from
opted-in custom answers.

---

## Lever — `jobs.lever.co` (R)

**Shape:** single page, plain HTML `<form>`. The simplest of the four.

**Fields (built-in, stable `name` attributes):** `name` (full name), `email`,
`phone`, `org` (**current company**), `location`, `resume` (file),
`urls[LinkedIn]`, `urls[GitHub]`, `urls[Portfolio]`, `urls[Other]`. Pronouns and
other personal questions are configurable per account.

**Custom / additional questions:** rendered as "cards" —
`name="cards[<uuid>][field0]"`, `[field1]`… — no stable mapping, handled by the
label resolver only.

**Steps:** resume upload → personal info → links → additional questions →
consent/GDPR checkboxes (user ticks these) → submit.

**Work history / education:** Lever usually collects these as a single free-text
"Additional information" box rather than structured fields, so the extension puts
the most recent employer in `org` and leaves the rest for the user.

---

## Ashby — `jobs.ashbyhq.com` (R) — substitute for "BrightHire"

> BrightHire is interview-intelligence software, not an application ATS —
> candidates never fill a form in it. Ashby was chosen as the fourth target
> because it is common among UK startups/scaleups. Swap the adapter if you want
> SmartRecruiters / Teamtailor / BreezyHR instead.

**Shape:** React SPA backed by GraphQL, single page.

**Fields:** built-ins expose `name="_systemfield_name"` / `_systemfield_email` /
`_systemfield_phone` / `_systemfield_resume`, plus LinkedIn and a location
autocomplete. Everything else is a custom field addressed by its visible label.

**Steps:** CV upload (pre-fills name/email/phone) → basic information → links →
role-specific questions → submit.

**Extension behaviour:** system fields mapped by `name`; the rest by label. The
CV dropzone is a real file input — the extension cannot attach files.

---

## Cross-cutting notes

- **Never auto-submit.** All four adapters fill only; the user reviews and submits.
- **Resume upload** is always manual (file inputs can't be set from an extension).
- **Consent / GDPR / EEO** checkboxes are never ticked automatically; EEO answers
  come only from custom answers the user explicitly opted in.
- **Repeated sections** (Workday/Greenhouse education & employment) must have their
  "Add" button clicked to create enough rows before the extension can fill row 2+.
  The current build fills whatever rows already exist; auto-adding rows is a
  follow-up.
