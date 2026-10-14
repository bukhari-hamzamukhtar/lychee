# QP-014 — Component obsolescence and substitution procedure

**Issue:** 6 · **Owner:** Quality and Supply Chain · **Review:** annual

Governs what happens when a supplier issues a Product Change Notification (PCN)
or an end-of-life notice against a component in a released product.

## 1. Scope and service commitment

Products under a supply contract are supported for **three years** from the last
shipment under that contract. Spares and warranty replacements are covered by
the same commitment. A last-time-buy is therefore sized to **156 weeks** of
forecast consumption plus a **10% buffer** for scrap, warranty and yield loss.

## 2. Triage, within five working days of receipt

Every notice is assessed for:

1. Which finished products contain the part, at every level of the bill of
   materials, including parts reached through sub-assemblies.
2. Quantity consumed per finished unit, summed across every route — a component
   reaching a product through two different assemblies is counted on both.
3. Stock on hand expressed as weeks of cover at current consumption.
4. Whether cover exceeds the replenishment lead time. Where it does not, the
   exposure is immediate and independent of the notice deadline.
5. Whether the part is named in any certification clause (see the EN 61800-3 and
   UL 61800-5-1 approval records).
6. Customers holding a supply contract for any affected product.

## 3. Decision

The default response is a **last-time-buy** covering the service commitment.
Substitution is considered only where the part is named in no certification
clause, or where a qualified substitute already exists in the approved vendor
list.

Where the part is certification-critical, substitution requires the
requalification cost and lead time in the relevant approval record to be
carried in the business case. That cost is incurred **per affected product**.

## 4. Authority

| Commitment | Approver |
|---|---|
| Up to EUR 50,000 | Supply chain manager |
| EUR 50,000 to EUR 500,000 | Operations director |
| Above EUR 500,000 | Board, with written business case |

No last-time-buy order is placed without a named approver recorded against it.
An automated system may prepare the order and the business case; it may not
commit the spend.

## 5. Customer notification

Customers under contract for an affected product are notified where the change
alters form, fit, function, or the certification basis. Where a last-time-buy
fully covers the commitment and nothing about the product changes, notification
is courtesy rather than obligation, and states plainly that no action is
required of them.

## 6. Records

Retained for the contracted service life plus two years: the original notice,
the impact assessment including the bill-of-materials paths used, the approver,
the purchase order, and the date code range received.
