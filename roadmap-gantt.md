```mermaid
gantt
    title RTD Project Roadmap, May–June 2026
    dateFormat  YYYY-MM-DD
    section Sprint 1 (4th–15th May)
    Track initiated vs completed payments     :done,      a1, 2026-05-04, 2026-05-15
    Admin alerts for payment failures         :           a2, 2026-05-04, 2026-05-15
    Registration analytics reliability (log)  :           a3, 2026-05-04, 2026-05-15
    Reduce registration time                  :           a4, 2026-05-04, 2026-05-15
    Fix critical site builder bugs            :           a5, 2026-05-04, 2026-05-15
    Regression + tracking validation          :           a6, 2026-05-04, 2026-05-15

    section Sprint 2 (18th–29th May)
    Admin alerts for incomplete payments      :after a1,  a7, 2026-05-18, 2026-05-29
    Daily cron for drop-off recovery          :after a1,  a8, 2026-05-18, 2026-05-29
    Drop-off dashboard (v1)                   :after a1,  a9, 2026-05-18, 2026-05-29
    SEO for core RTD pages                    :           a10, 2026-05-18, 2026-05-29
    Meta pixel integration (global)           :           a11, 2026-05-18, 2026-05-29
    Recovery flow validation                  :           a12, 2026-05-18, 2026-05-29

    section Sprint 3 (1st–12th June)
    Optimize scoring for large races          :           a13, 2026-06-01, 2026-06-12
    Load testing for large races              :after a13, a14, 2026-06-01, 2026-06-12
    Registration analytics reliability (cmp)  :           a15, 2026-06-01, 2026-06-12
    SEO for active race pages                 :           a16, 2026-06-01, 2026-06-12
    Predefined analytics queries (no NLP)     :after a15, a17, 2026-06-01, 2026-06-12
    Query UI (dropdown-based)                 :after a15, a18, 2026-06-01, 2026-06-12
    Load + analytics validation               :           a19, 2026-06-01, 2026-06-12

    section Sprint 4 (15th–26th June)
    Report download functionality             :after a17, a20, 2026-06-15, 2026-06-26
    Auto Meta pixel in generated sites        :after a11, a21, 2026-06-15, 2026-06-26
    AI-assisted email templates               :           a22, 2026-06-15, 2026-06-26
    Template selection UI                     :           a23, 2026-06-15, 2026-06-26
    Dashboard + alert improvements            :           a24, 2026-06-15, 2026-06-26
    Email + system validation                 :           a25, 2026-06-15, 2026-06-26
```
