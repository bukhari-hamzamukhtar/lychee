# Demo video — shot list and script

**Target 3:30. Hard ceiling 5:00.** lablab's own guidance says some judges stop watching
at three minutes, so everything that matters is in the first two.

Record at 1920x1080, browser at 100% zoom. Narrate over the screen; no face camera,
no music.

**Before recording:**
- Open the deployed URL, not localhost. Judges will click the link; show them the thing
  they will click.
- Run one assessment and discard the take. The first call compiles the route and takes
  twice as long.
- Clear the workspace so Approvals starts empty — the approval at the end lands better
  if the queue was empty before it.
- Have `pcn-test.pdf` (or any supplier notice PDF) on the desktop, ready to drag.

---

## 0:00 – 0:25 · The problem

> Every factory gets these. A supplier emails a PDF saying a component is discontinued,
> and you have thirty-four days to place a final order. After that you can never buy
> that part again.
>
> Working out what it actually breaks takes days. Which products use it. How many go in
> each. Which customers are under contract. Whether a certification names it. How much
> stock is left.

**On screen:** the Notices inbox. Three notices in German, Japanese and English, and the
portfolio strip above them — nine million euros exposed, soonest deadline thirty-four
days.

Do not say "AI" yet. Say the problem.

---

## 0:25 – 1:00 · Drop in a document it has never seen

This is the strongest opening we have. Do it before anything else.

**On screen:** drag the PDF onto the dropzone. Let the stages tick through live.

> This is a supplier notice it has never seen. It is read by MinerU on AMD GPUs, the
> fields come out through Evolus, and then the part numbers are checked against our own
> bill of materials.

**On screen:** it lands on the new notice's page.

> Seventeen seconds. Six hundredths of a cent of AMD inference, and about two Evolus
> credits. Cheap enough to run on every notice that arrives, which is the point.

If you have time for one extra beat, drop a document that names **no** part you build and
show it being refused. "It read the file and told me there is nothing here to assess"
is a strong second-order signal.

---

## 1:00 – 1:50 · What it actually breaks

**On screen:** the impact panel. Pause on the four numbers.

> Five products affected. Thirteen of these in a single MD-7500, because the part gets
> there by two different routes — through the gate driver module, and again on the
> control board.

**On screen:** point at the two paths printed under MD-7500.

> Every route is printed. You can check that thirteen by hand in five seconds. This is
> arithmetic over a graph, not a model guessing — ask a model to do this and it invents
> quantities.

Then the line the whole demo exists for:

> And here is what nobody knew. Four point seven weeks of stock, against a twenty-six
> week lead time. They are already twenty-one weeks short. That has nothing to do with
> the deadline in the letter. It is true today, and their current process would never
> have surfaced it.

---

## 1:50 – 2:30 · The agent

**On screen:** click **Assess notice**. Let the stages run. Do not cut.

> Evolus translates it, extracts the fields, the engine propagates, an AMD-hosted model
> writes the memo, and an Evolus agent rules on the certifications.

**On screen:** the per-stage provider badges and costs, then the memo, then the ruling.

> The agent cites the clause — EN 61800-3, six three two. It runs on the AMD endpoint
> connected to the workspace, and answers only from the company's own approval records.

---

## 2:30 – 2:50 · The refusal

> Ask it something those documents do not cover, and it will not answer.

**On screen:** the thermal derating reply, or a prepared screenshot of it.

> No derating curve in the library, so it says so and sends you to an engineer. That is
> what you need before anything goes near a one-point-four-million-euro purchase order.

Twenty seconds, worth more than any feature. Do not cut it.

---

## 2:50 – 3:10 · The gate, and the queue

**On screen:** the two drafts, then **Approve**. Then click through to **Approvals**.

> It drafts the order to the supplier and the notice to the six affected customers. And
> then it stops. A person commits the spend, and the approval is recorded against the
> part with the authority level the procedure requires. The agent prepares the decision.
> It does not take it.

---

## 3:10 – 3:30 · Before the letter arrives

**On screen:** the **Parts** tab. Let the risk meters land.

> And it does not wait to be told. Every component is scored from its position in the
> graph and its supplier's history, so the work queue exists before a notice forces it.

> Obsolescence management is already an industry — SiliconExpert, Z2Data, IHS. Every one
> of them is a database you search. This is the first that reads the incoming notice and
> tells you what breaks.
>
> Days to twenty seconds, for a tenth of a cent.

End there. No thank-you slide, no roadmap, no team photo.

---

## Mistakes to avoid

- **Do not narrate the UI.** "Here I click the button" wastes the budget. Say what it
  means, not what you are doing.
- **Do not cut away during a live run.** Watching the stages tick is the proof it is
  real. Edited-out latency reads as faked.
- **Do not open with the stack.** Problem first, then the upload. The technology is how,
  not why.
- **Do not apologise for synthetic data.** It is stated in the README and the submission.
  In the video it is a distraction.
- **Do not show localhost.** Show the deployed URL.
