# Demo video — shot list and script

**Target 3:30. Hard ceiling 5:00.** lablab's own guidance says some judges stop watching
at three minutes, so everything that matters is in the first two.

Record the screen at 1920x1080, browser zoom 100%, dark theme. Narrate over it; a face
camera is not needed and costs you time.

**Before recording:** run one assessment and discard it. The first call compiles the
route and takes twice as long. The second is the one you record.

---

## 0:00 – 0:25 · The problem

> Every factory gets these. A supplier emails a PDF saying a component is discontinued,
> and you have thirty-four days to place a final order. After that you can never buy
> that part again.
>
> Working out what it actually breaks takes days. Which products use it. How many go in
> each. Which customers are under contract. Whether a certification names it. How much
> stock is left.

**On screen:** the inbox, three notices in German, Japanese and English. Hover them so
the language tags read.

Do not say "AI" yet. Say the problem.

---

## 0:25 – 0:45 · The notice

> This one is from Analog Devices, and it is in German. Nobody on the procurement desk
> reads German.

**On screen:** click `PCN-ADI-2026-4471`. Let the German text sit there for a beat. That
beat is doing work — it establishes the real obstacle.

---

## 0:45 – 1:40 · The impact

> LastBuy propagates it through the bill of materials.

**On screen:** scroll to the impact panel. Pause on the four numbers.

> Five products affected. Thirteen of these in a single MD-7500, because the part
> arrives there by two different routes — through the gate driver module and again on
> the control board.

**On screen:** point at the two paths under MD-7500.

> Every path is printed. You can check the thirteen by hand in five seconds. This is
> arithmetic over a graph, not a language model guessing — ask a model to do this and it
> invents quantities.

Then the line the whole demo exists for:

> And here is what nobody knew. Four point seven weeks of stock, against a twenty-six
> week lead time. They are already twenty-one weeks short. That has nothing to do with
> the deadline in the letter — it is true today, and their current process would never
> have surfaced it.

**On screen:** the red exposure banner.

---

## 1:40 – 2:30 · The agent

> Now the agent runs.

**On screen:** click **Assess notice**. Let the stages tick through live. Do not cut.

> Evolus translates it, extracts the fields, the engine propagates, an AMD-hosted model
> writes the memo, and an Evolus agent rules on the certifications.

**On screen:** the per-stage badges and costs.

> Nine Evolus credits. Twelve thousandths of a cent of AMD inference. That is the cost
> of running this on every notice that arrives.

**On screen:** scroll to the memo, then the certification ruling.

> The agent cites the clause — EN 61800-3, six three two. It runs on the AMD endpoint
> connected to the workspace, and it answers only from the company's own approval
> records.

---

## 2:30 – 2:50 · The refusal

> Ask it something the documents do not cover, and it will not answer.

**On screen:** the thermal derating reply, or a screenshot of it.

> No derating curve in the library, so it says so and sends you to an engineer. That is
> the behaviour you need before you let anything near a one-point-four-million-euro
> purchase order.

This twenty seconds is worth more than any feature. Do not cut it.

---

## 2:50 – 3:10 · The gate

**On screen:** the two drafts, then **Approve order and notifications**.

> It drafts the order to the supplier and the notice to the six affected customers. And
> then it stops. A person commits the spend. The agent prepares the decision. It does
> not take it.

---

## 3:10 – 3:30 · The business case

> Obsolescence management is already an industry — SiliconExpert, Z2Data, IHS. Companies
> pay for it today. But every one of those is a database you search. This is the first
> one that reads the incoming notice and tells you what breaks.
>
> Days to twenty seconds, for a tenth of a cent.

End there. No thank-you slide, no roadmap, no team photo. The last thing in their ear
should be the number.

---

## Mistakes to avoid

- **Do not narrate the UI.** "Here I click the button" wastes the budget. Say what it
  means, not what you are doing.
- **Do not cut away during the live run.** Watching the stages tick is the proof it is
  real. Edited-out latency reads as faked.
- **Do not open with the stack.** Problem first. The technology is how, not why.
- **Do not apologise for synthetic data.** State it once in the README and the
  submission. In the video it is a distraction.
- **No background music.** It fights the narration and adds nothing.
