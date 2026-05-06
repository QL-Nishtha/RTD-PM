# RTD Project Roadmap – Q2 2026

## Sprint 1 (W1–2) [4th–15th May]
**Theme:** Foundation (Funnel + Stability)
- **Backend**
  - Track initiated vs completed payments (`1.2`)
    _Outcome:_ Funnel visibility established
  - Admin alerts for payment failures (`7.3`)
    _Outcome:_ Faster issue detection
  - Registration analytics reliability – logging fixes (`5.3 (P1)`)
    _Outcome:_ Clean data layer
- **Frontend**
  - Reduce registration time (`1.1`)
    _Status:_ No solution/approach so far.
    _Outcome:_ TBD
  - Fix critical site builder bugs (`4.1`)
    _Outcome:_ Removes adoption blockers
- **QA**
  - Regression + tracking validation
    _Outcome:_ Data accuracy ensured

---

## Sprint 2 (W3–4) [18th–29th May]
**Theme:** Recovery + Insights
- **Backend**
  - Admin alerts for incomplete payments (`1.3`) _(dep: 1.2)_
    _Outcome:_ Recovery trigger enabled
  - Daily cron for drop-off recovery (`1.4`) _(dep: 1.2)_
    _Outcome:_ Automated recovery system
  - Meta pixel integration (global) (`3.3`)
    _Outcome:_ Attribution tracking
- **Frontend**
  - Drop-off dashboard v1 (`1.5`) _(dep: 1.2)_
    _Outcome:_ Actionable insights
  - SEO for core RTD pages (`3.1`)
    _Outcome:_ Organic traffic base
- **QA**
  - Recovery flow validation
    _Outcome:_ End-to-end correctness

---

## Sprint 3 (W5–6) [1st–12th June]
**Theme:** Scale + Analytics MVP
- **Backend**
  - Optimize scoring for large races (`2.2`)
    _Outcome:_ Scale readiness
  - Load testing for large races (`2.3`) _(dep: 2.2)_
    _Outcome:_ Failure thresholds known
  - Registration analytics reliability (complete) (`5.3 (P2)`) _(dep: P1)_
    _Outcome:_ Trusted reporting
  - Predefined analytics queries (no NLP) (`5.1 (MVP)`) _(dep: 5.3)_ – **Medium priority**
    _Outcome:_ Faster insights access
- **Frontend**
  - SEO for active race pages (`3.2`)
    _Outcome:_ Traffic expansion
  - Query UI (dropdown-based) (`5.1 (MVP)`) _(dep: 5.3)_ – **Medium priority**
    _Outcome:_ Usable analytics layer
- **QA**
  - Load + analytics validation
    _Outcome:_ Stability ensured

---

## Sprint 4 (W7–8) [15th–26th June]
**Theme:** Monetization + Automation
- **FE/BE**
  - Report download functionality (`5.4`) _(dep: 5.1)_
    _Outcome:_ Export capability
- **Backend**
  - Auto Meta pixel in generated sites (`4.5`) _(dep: 3.3)_
    _Outcome:_ Reduces manual setup
  - AI-assisted email templates (MVP) (`8.1`)
    _Outcome:_ Faster email creation
- **Frontend**
  - Template selection UI (MVP) (`8.1`)
    _Outcome:_ Simple UX
- **FE/BE**
  - Dashboard + alert improvements
    _Outcome:_ UX polish
- **QA**
  - Email + system validation
    _Outcome:_ Release readiness

---

## Key
- **Status:** All items prioritized High unless otherwise noted
- **Owners:** BE = Backend, FE = Frontend, QA = Quality Assurance

> Update dependencies, owners, and priorities as tasks progress.  
> Mark completed deliverables, add blockers, or refine outcomes during sprint reviews.
