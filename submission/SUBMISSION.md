# lablab submission — copy and paste

Deadline **Sat 18 Oct 2026, 3:00 PM PKT**. Submit by 1:00 PM; the platform is slow at
the deadline.

---

## Project title

```
LastBuy
```

## Short description

```
A supplier discontinues a component and gives you 34 days. LastBuy reads the notice in
any language, propagates it through the bill of materials, and tells you which products,
customers and certifications are affected, how many to buy, and by when.
```

## Challenge / track

```
Intelligent Industry  (plus the Evolus Business Agents partner track)
```

## Long description

```
Every factory gets a stream of supplier PDFs: Product Change Notifications and
end-of-life notices. "Part ADUM1201ARZ is discontinued. Last-time-buy in 34 days."

Someone then has to work out, by hand, which finished products contain that part at
every level of the bill of materials, how many go into each one, which customers hold
supply contracts for them, whether any certification names the part as critical, how
many weeks of stock remain, and how many to buy before the door closes forever. It takes
days, across several people, in spreadsheets. Miss the date and the part can never be
bought again; the line stops or the product is redesigned.

There is an entire paid industry for this — SiliconExpert, Z2Data, IHS — which is the
proof that companies will pay. But every existing tool is a database you search. Nobody
has built the thing that reads the incoming notice and tells you what breaks.

LastBuy does. Drop in a notice and in about twenty seconds you get the full impact, the
memo, and the drafted orders.

HOW IT WORKS

The notice arrives in the supplier's language. Evolus `translate` puts it into English
and `doc-structure` pulls out the part numbers and dates.

The impact itself is computed by a graph engine with no language model in it at all. A
bill of materials is a directed graph, and propagating a change through it is exact
arithmetic: quantity per product sums over every route, because a component can reach
the same product through more than one path. Ask a language model to do this and it
invents quantities. So the engine decides what is affected and prints every path it used
— ADUM1201ARZ to ASM-GATE-D to ASM-PWR-A to MD-7500 — so any number can be checked by
hand in seconds.

An AMD-hosted open model then writes the procurement memo. It is never asked for a
number: the figures are handed to it as established facts and it is instructed that it
may not introduce one of its own.

An Evolus agent, running on that same AMD endpoint connected as the workspace's own
model, rules on certification consequence from the company's approval records. It cites
the standard and the clause for every claim. Asked for something the documents do not
contain, it says so and refers the question to a qualified engineer rather than
answering.

Evolus `email` then drafts the last-time-buy order to the supplier and the notification
to affected customers. Nothing is addressed and nothing is sent. A person approves the
spend; the agent prepares the decision, it does not take it.

The system also scores every part for obsolescence risk from its position in the graph
and its supplier's history, before any notice arrives.

WHAT IT FOUND

On the worked example, a dual-channel digital isolator discontinued with 34 days'
notice: it reaches 5 finished products through 3 assemblies by 7 distinct paths, 13 of
them in a single MD-7500. Consumption is 3,024 pieces a week against 14,200 in stock.

That is 4.7 weeks of cover against a 26-week replenishment lead time. The company is
already 21 weeks short, and nothing in their current process would have told them. The
last-time-buy is 504,798 pieces, EUR 1,433,626, protecting EUR 9,058,546 of annual
revenue and two certifications that would otherwise re-open at EUR 90,000 and 34 weeks.

WHAT IT COSTS

A complete assessment is about 9 Evolus credits and $0.00012 of AMD inference. The
figure is on screen for every run, because a buyer deciding whether to run this on every
incoming notice needs it and so does a judge.

AMD

Every model call runs on AMD Token Factory, free OpenAI-compatible endpoints served on
AMD GPUs. The Evolus workspace is pinned to that same endpoint as its own model, so the
agent generates on AMD too rather than on a model the platform chose.

Gemma-4-31B-IT would be the preferred generator and the code switches to it with one
environment variable. During the event it collapsed into repeated fragments and leaked
raw special tokens on every call, short or long; two probe scripts in the repository
reproduce it. The default is a model that works, and a guard keeps a collapsed
generation out of the response either way.
```

## Technology tags

```
AMD Developer Cloud
AMD ROCm
Evolus
Next.js
TypeScript
```

## Cover image

16:9. The impact panel for ADUM1201ARZ: `4.7 wk` runway against `lead time 26 wk`, with
`504,798 / EUR 1,433,626` beside it. The whole pitch is in those two numbers.

## Repository

```
https://github.com/bukhari-hamzamukhtar/lychee
```

## Application URL

```
(the Vercel URL)
```

---

## Evolus track — what the reviewers will look for

They verify by inspecting the workspace configuration and usage statistics.

| Requirement | How it is met |
|---|---|
| Built in the event workspace | Space `520d309c-1379-4abf-8651-70246047abc4` |
| Main agent on an open model served on AMD | Agent `Obsolescence Analyst` runs on `own/deepseek-v4-flash`, the AMD Token Factory endpoint connected under "Your models" |
| At least two building blocks | Agents, and AI Tools (`translate`, `doc-structure`, `email` x2) |
| Driven through the APIs | Every call is REST or the OpenAI-compatible agent endpoint. Nothing is clicked. |
| Containerized, public repo, README that runs | Dockerfile, public repo, README with working commands |
| No committed keys | `.env.local` gitignored, `.env.example` documents every variable |
