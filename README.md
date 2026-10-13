# LastBuy

A supplier sends a PDF: *"part discontinued, last-time-buy in 34 days."* Someone now has
to work out which products use it, which customers are under contract, which
certifications re-open, how many weeks of stock remain, and how many to buy before the
door closes. Today that takes days, across several people, in spreadsheets. Miss the
date and the part can never be bought again.

LastBuy reads the notice and answers all of it in seconds.

Built for the **AMD Developer Hackathon: ACT III** — Track 1, Intelligent Industry, and
the **Evolus Business Agents** partner track.

## How it works

```
supplier notice (PDF, often German / Japanese / Chinese)
   |
   |-- MinerU2.5-Pro OCR .................... AMD
   |-- Evolus `tables` + `doc-structure` ....  part numbers, dates, replacement
   v
GRAPH ENGINE  -- exact, auditable, no language model
   part -> module -> board -> product -> customer
                        |
                        +-> certification, stock runway, last-buy quantity
   |
   |-- Gemma-4-31B writes the impact memo .... AMD + Google
   |-- Evolus `translate` + `email` ......... draft the PO and the customer notice
   v
HUMAN APPROVES, then it sends
```

**Why the engine contains no LLM.** Propagating a change through a multi-level bill of
materials is exact arithmetic over a directed graph. Ask a language model to do it and it
invents quantities. So the split is honest: the graph decides *what is affected* and
shows every path it used, and the model does what it is good at — reading a notice in a
language you do not speak, and writing the memo.

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
| Certifications re-opened | EN 61800-3, UL 61800-5-1 |

The runway figure is the one that matters: the company is already 21 weeks short, and
nothing in their current process would have told them.

## Stack

| Layer | Choice |
|---|---|
| Reasoning + drafting | `Gemma-4-31B-IT` on AMD Token Factory |
| Document OCR | `MinerU2.5-Pro` on AMD Token Factory |
| Business process | Evolus — workflow, `tables`, `doc-structure`, `translate`, `email` |
| Impact engine | TypeScript, deterministic DAG traversal |
| App | Next.js 15, TypeScript, Tailwind |

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

## Docker

```bash
docker build -t lastbuy .
docker run -p 3000:3000 --env-file .env.local lastbuy
```

## Environment

See `.env.example`. No key is committed; `.env.local` is gitignored.

## Data

`data/factory.ts` is synthetic, modelled on a mid-size Italian drives manufacturer.
Part numbers follow real manufacturer conventions. No customer or supplier data is real.
