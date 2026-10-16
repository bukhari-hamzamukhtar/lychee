# LastBuy

A supplier sends a PDF: *"part discontinued, last-time-buy in 34 days."* Someone now has
to work out which products use it, which customers are under contract, which
certifications re-open, how many weeks of stock remain, and how many to buy before the
door closes. Today that takes days, across several people, in spreadsheets. Miss the
date and the part can never be bought again.

LastBuy reads the notice and answers all of it in about half a minute.

Built for the **AMD Developer Hackathon: ACT III** — Intelligent Industry, and the
**Evolus Business Agents** partner track.

Live: <https://lychee-seven.vercel.app>

## The application

The workspace **starts empty**. It holds nothing until you load a bill of materials or
upload a notice, because a tool that opens showing three supplier letters and a
countdown is making a claim about what you have received, and it is wrong. The worked
example lives on the landing page, and loading it into the workspace is a deliberate
click that carries a banner on every screen saying none of it was sent to you.

| | |
|---|---|
| **Notices** | The inbox and the dropzone. Drop in a PDF or a photo of one, in any language. |
| `/notices/[id]` | One notice: its impact, the agent run, the memo, the certification ruling, the drafts, and the approval gate. A run is saved, so revisiting does not re-bill it. |
| **Parts** | Every component, scored for obsolescence risk *before* a notice arrives. A part page shows what drives its score, every route by which it reaches a product, and what a discontinuation would cost. |
| **Products** | What each line is built from, and the risk it inherits from its most exposed component. |
| **Suppliers** | Who supplies what, ranked by how often they have discontinued parts before. |
| **Certifications** | Which certificates depend on which components, and what a change forces you to re-test. |
| **Approvals** | What a person has actually committed, with the authority level QP-014 requires for the amount. |
| **Bill of materials** | Import your own, as a CSV from any PLM or ERP. Columns are inferred by meaning and you correct the guess before anything loads. |
| **Ask** | The agent, with the whole workspace in front of it. Drop in as many documents as you like and ask across all of them at once. |

Uploaded notices, imported bills of materials, saved assessments, approvals and
conversations persist in the browser, so the workspace survives a reload. Accounts keep
one person's workspace separate from another's on the same machine — in this browser
only; `lib/auth.ts` says so plainly and so does the sign-in page.

### Bringing your own bill of materials

There is no public corpus of real manufacturing bills of materials, because they are the
most commercially sensitive thing a manufacturer owns. That absence *is* the answer: the
BOM is the customer's data, which is why every tool in this category takes an upload.

So `lib/bom-import.ts` reads a CSV as exported and infers what each column means from its
header — `MPN`, `Manufacturer Part Number` and `Part No` all land in the same place. A
flat export becomes one product; a parent column is honoured as a hierarchy. The inferred
mapping is shown and can be corrected before anything loads, and every screen then
computes from it.

### Uploading a notice

`MinerU2.5-Pro` accepts a base64 data URI, so a file is read on AMD GPUs without being
hosted anywhere first. Then the deterministic readers run, and **a model is only asked
for what the document did not say plainly.**

That ordering is the point. A supplier notice is a form: it states its category in a
ticked box, prints its last-time-buy date beside a label, and lists its part numbers.
JEDEC standardises the layout in JESD46. `lib/notice-read.ts` reads all of that directly,
and only when something is genuinely missing — no date, no ticked category and no heading
to go on, or no part number in a recognisable form — does the request go on to Evolus
`doc-structure` and an AMD-hosted model.

On a real 488 KB scanned PCN the difference is 161 seconds against 27:

| | model always | readers first |
|---|---|---|
| OCR | 42s | 27s |
| Evolus extraction | 17s | skipped |
| model normalisation | 103s | skipped |
| **total** | **161s** | **27s** |
| cost | 10.4 credits + $0.00026 | nothing |

Vercel stops a function at 60 seconds, so the first column did not merely cost money, it
failed outright.

The part numbers are matched against the real bill of materials last. A document naming
no component you build is **rejected**, not assessed, because an impact report for a part
you do not make is worse than none.

Progress is streamed as NDJSON — each stage announces itself when it starts and again
when it finishes — because a request that returns nothing for half a minute is
indistinguishable from one that has died. The upload belongs to the workspace rather than
to the page, so leaving the tab does not cancel it.

## How it works

Impact is a **graph traversal, not a generation**. `lib/graph.ts` walks the bill of
materials from a component up to every finished product that contains it, multiplying
quantities along the way, and the numbers on screen are that arithmetic. Nothing a model
said is ever presented as a computed figure.

Models are used for the things models are good at: reading a scanned document in a
language you do not speak, and writing the memo a procurement lead has to sign.

## Ask, and what the agent remembers

Conversations are separate and their memory does not leak between them. Documents are
shared, because they are files you added rather than something one conversation
discovered.

A context gauge shows what the agent is actually being given, split by where it came
from. When the window fills, the conversation is **not summarised**. It is distilled into
assertions — each with a subject, a claim, how it is known (read from a document,
computed by the engine, or inferred), and which document or computation it came from —
and the transcript is then discarded. A paragraph saying "we discussed the Hittite
notice" cannot be checked, contradicted by new evidence, or attached to a part. An
assertion can be all three.

**Forking** is the deliberate way to carry memory across: the parent's transcript is
distilled, the claims go to the child, and the child starts with an empty window.

Grounded answers must cite. A claim read from a document ends with the filename; a figure
computed from the bill of materials ends with `[engine]`; and the model is told never to
present one as the other.

The idea is from a dissertation on neurosymbolic knowledge graphs: an edge is a
connector, a node is an event, and provenance is part of the data rather than a note
about it.

## AMD — where every model call goes

```
https://developer.amd.com.cn/radeon/api/v1
```

**[`lib/amd.ts`](lib/amd.ts) is the only file in this repository that reaches an
inference provider.** It has exactly two ways out, and both post to the endpoint above:

| function | request |
|---|---|
| [`ocr()`](lib/amd.ts) | `POST https://developer.amd.com.cn/radeon/api/v1/ocr` |
| [`chat()`](lib/amd.ts) | `POST https://developer.amd.com.cn/radeon/api/v1/chat/completions` |

There is no OpenAI, no Anthropic, and no other hosted model anywhere in the codebase —
`grep -rn "api.openai\|anthropic" lib app` returns nothing. The Evolus agent is bound to
that same AMD endpoint as a custom model, so its answers are generated on AMD too rather
than on a model Evolus chose.

Every call made by the running application is attributed on screen. Upload a notice and
each stage shows which provider served it and what it cost:

```
AMD     read the document                    13.0s
EVOLUS  extract fields                        8.2s
AMD     normalise the notice                 16.7s
ENGINE  match against the bill of materials   5 of our 9 parts named
```

| model | used for |
|---|---|
| `MinerU2.5-Pro` | OCR. Takes a data URI, returns Markdown per page. |
| `DeepSeek-V4-Flash` | Normalisation, memos, drafts, the agent, and distillation. |

Generation can additionally be served from a Gemma instance on an AMD Developer Cloud
droplet by setting one environment variable; OCR stays on Token Factory because MinerU
is only served there. See [docs/AMD-COMPUTE.md](docs/AMD-COMPUTE.md).

### Gemma, and why it is the generator

`Gemma-4-31B-IT` is Google's open model, served on AMD Instinct GPUs through
Token Factory. It is the default generator here — which also makes this project
eligible for the Google partner prize — and getting there took three days of it
being unusable:

| | |
|---|---|
| 14 Oct | present, but collapsing into repeated fragments and leaking raw `<\|tool_call>` on every call |
| 15 Oct, 20:50 | listed in `/models`, 12 models in the catalogue |
| 15 Oct, 21:50 | **withdrawn.** 11 models, nothing matching `/emma/i`, three consecutive checks. By name: `400 not supported` |
| 16 Oct | restored by AMD, and working |

It now passes every shape this pipeline asks of it — a one-word answer, strict
JSON for notice normalisation, and a long grounded memo — and it is markedly
quicker than the alternative, at roughly two seconds against seventeen:

```
npx tsx scripts/probe-gemma-fitness.ts

  pass  short answer                1.7s    5 chars
  pass  strict JSON, notice shape   3.9s  130 chars
  pass  memo, long generation      11.7s  1296 chars
```

A model that has been withdrawn once can be withdrawn again, so the fallback is
load-bearing rather than decorative: a hard failure on the generator retries
once on `DeepSeek-V4-Flash` inside `chat()`. Prove it by asking for a model that
does not exist — the answers still arrive:

```
npx tsx scripts/probe-gemma-fitness.ts Totally-Not-A-Model
```

`scripts/probe-gemma-id.ts` reproduces the withdrawal, and
`scripts/probe-gemma-short.ts` the original degeneration.

One limitation, reported by another team and not contradicted here: Gemma's
**vision** requests were returning HTTP 500 through 16 October. This pipeline
never sends it an image — OCR is MinerU2.5-Pro — so it does not arise.

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

Check the document readers against the real PCN and the date formats manufacturers
actually use — 21 assertions, no network, no spend:

```bash
npx tsx scripts/probe-notice-read.ts
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

`data/factory.ts` is the example factory: synthetic, modelled on a mid-size Italian
drives manufacturer, and never loaded unless asked for. Part numbers follow real
manufacturer conventions. No customer or supplier data is real, and the standards
documents in `data/library/` are written for this demo rather than reproduced from the
published standards.

The document the pipeline is tested against is real: Hittite Microwave **PCN140002**, a
2014 plating-vendor change notice.
