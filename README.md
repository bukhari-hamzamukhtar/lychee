# LastBuy

A supplier sends a PDF: *"part discontinued, last-time-buy in 34 days."* Someone now has
to work out which products use it, which customers are under contract, which
certifications re-open, how many weeks of stock remain, and how many to buy before the
door closes. Today that takes days, across several people, in spreadsheets. Miss the
date and the part can never be bought again.

LastBuy reads the notice and answers all of it in about twenty seconds.

Built for the **AMD Developer Hackathon: ACT III** — Intelligent Industry, and the
**Evolus Business Agents** partner track.

## The application

Three screens, not one page.

| | |
|---|---|
| **Notices** | The inbox, with portfolio figures across every open notice, and a dropzone. Drop in a PDF or a photo of one, in any language. |
| `/notices/[id]` | One notice: its impact, the agent run, the memo, the certification ruling, the drafts, and the approval gate. A run is saved, so revisiting does not re-bill it. |
| **Parts** | The whole bill of materials, searchable, every component scored for obsolescence risk *before* a notice arrives. A part page shows what drives its score, every route by which it reaches a product, and what a discontinuation would cost. |
| **Approvals** | What a person has actually committed, with the authority level QP-014 requires for the amount. |

Uploaded notices, saved assessments and approvals persist in the browser, so the
workspace survives a reload.

### Uploading a real notice

`MinerU2.5-Pro` accepts a base64 data URI, so a file is read on AMD GPUs without being
hosted anywhere first. Evolus `doc-structure` pulls out the fields, an AMD-hosted model
normalises them, and the part numbers are then matched against the real bill of
materials — a document naming no component you build is **rejected**, not assessed,
because an impact report for a part you do not make is worse than none.

A complete ingest runs in about 17 seconds for roughly 2 Evolus credits and
$0.00006 of AMD inference.

## How it works

```
supplier notice (PDF, often German / Japanese / Chinese)
   |
   |-- Evolus `translate` ..................... into English
   |-- Evolus `doc-structure` ................. part numbers, dates, replacement
   v
GRAPH ENGINE  -- exact, auditable, no language model
   part -> module -> board -> product -> customer
                        |
                        +-> certification, stock runway, last-buy quantity
   |
   |-- AMD-hosted model ....................... writes the impact memo
   |-- Evolus agent on the AMD model .......... rules on certification impact,
   |                                            citing the clause
   |-- Evolus `email` x2 ...................... drafts the PO and the customer notice
   v
HUMAN APPROVES, then it sends
```

**Why the engine contains no LLM.** Propagating a change through a multi-level bill of
materials is exact arithmetic over a directed graph. Ask a language model to do it and it
invents quantities. So the split is honest: the graph decides *what is affected* and
shows every path it used, and the model does what it is good at — reading a notice in a
language you do not speak, ruling on a standard, and writing the memo.

The model is never asked for a number. Figures are handed to it as established facts,
and it is instructed that it may not introduce one of its own.

## Worked example

`ADUM1201ARZ`, a dual-channel digital isolator, discontinued with 34 days' notice:

| | |
|---|---|
| Reaches | 5 products, through 3 assemblies, by 7 distinct BOM paths |
| Quantity | 7 per MD-3000, 13 per MD-7500, 6 per PSU-240 |
| Consumption | 3,024.5 pcs/week |
| Stock runway | **4.7 weeks**, against a 26-week lead time |
| Last buy | 504,798 pcs, EUR 1,433,626 |
| Revenue at risk | EUR 9,058,546 / year |
| Certifications re-opened | EN 61800-3 §6.3.2, UL 61800-5-1 §4.4 |

The runway figure is the one that matters: the company is already 21 weeks short, and
nothing in their current process would have told them.

A full run costs about **9 Evolus credits** and **$0.00012** of AMD inference.

## AMD

Everything the models do runs on AMD Token Factory, free OpenAI-compatible endpoints
served on AMD GPUs. The Evolus workspace is pinned to that same endpoint as its own
model, so the agent's answers are generated on AMD too, not on a model Evolus chose.

A note on model choice: `Gemma-4-31B-IT` would be the preferred generator, and the code
switches to it with one environment variable. On 14 October 2026 it collapses into
repeated fragments and leaks raw special tokens on every call, short or long, so the
default is a model that works. `scripts/probe-model.ts` and `scripts/probe-gemma-short.ts`
reproduce it.

## Evolus

| Block | Use |
|---|---|
| Agent | Rules on certification impact, running on the connected AMD model |
| AI Tools | `translate`, `doc-structure`, `email` |
| Knowledge documents | EN 61800-3 and UL 61800-5-1 approval records, QP-014 procedure |

The agent is instructed to cite the standard and clause for every claim, and to decline
anything the documents do not cover. Asked for a thermal derating curve that is not in
them, it says so and refers the question to a qualified engineer.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your own keys
npm run dev
```

Verify the engine's arithmetic against hand calculations:

```bash
npx tsx scripts/verify.ts
```

Check the agent cites and declines correctly:

```bash
npx tsx scripts/probe-agent.ts
```

## Docker

```bash
docker build -t lastbuy .
docker run -p 3000:3000 --env-file .env.local lastbuy
```

## Environment

See `.env.example`. No key is committed; `.env.local` is gitignored.

## Data

`data/factory.ts` is synthetic, modelled on a mid-size Italian drives manufacturer.
Part numbers follow real manufacturer conventions. No customer or supplier data is real,
and the standards documents in `data/library/` are written for this demo rather than
reproduced from the published standards.
