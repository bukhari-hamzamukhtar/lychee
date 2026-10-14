# EN 61800-3 — EMC approval record

**Standard:** EN 61800-3, Adjustable speed electrical power drive systems —
Part 3: EMC requirements and specific test methods
**Products in scope:** MD-3000, MD-7500
**Certificate holder:** internal approval file DRV-EMC-2024-11
**Last full assessment:** March 2024
**Requalification lead time:** 14 weeks · indicative cost EUR 38,000

## Clause 6.3.2 — galvanic isolation barrier components

The isolation barrier between the power stage and the control electronics is
assessed as a system. Any component forming part of that barrier is
certification-critical: substituting one invalidates the emissions and immunity
evidence for every product that contains it, and the approval file must be
reissued with fresh test data.

Components designated critical under this clause:

| Part | Function in the barrier |
|---|---|
| ADUM1201ARZ | Dual-channel digital isolator, gate drive command path |
| TLP2361 | Optocoupler, fault feedback path |
| B32774D8106K000 | Film capacitor, common-mode filtering across the barrier |

A substitute is acceptable only where **all** of the following hold:

1. Creepage and clearance distances are equal to or greater than the original.
2. The isolation withstand voltage rating is equal or higher.
3. Common-mode transient immunity is equal or higher.
4. Emissions and immunity are re-tested for each affected product.

A part that is electrically equivalent but differs in package or creepage is
**not** a drop-in for the purposes of this clause.

## Clause 6.4.1 — evidence required on substitution

Reissuing the approval file requires, per affected product:

- Radiated emissions, 30 MHz to 1 GHz
- Conducted emissions on the mains port
- Immunity to fast transients and surge on power and signal ports
- An updated technical construction file listing the substituted part

## Clause 7.2 — notification obligations

Where a product under a supply contract undergoes a change affecting its EMC
construction, customers holding that contract are notified in writing before
the first changed unit ships. Notification is required even where the change is
assessed as having no effect on form, fit or function.

## Standing note on obsolescence

Where a critical component is discontinued and no compliant substitute exists,
a last-time-buy covering the contracted service life is the preferred route,
because it avoids reopening the approval entirely. The decision is a commercial
one, but the certification cost of the alternative is the figure above and is
incurred per product, not once.
