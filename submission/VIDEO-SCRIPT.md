# Video — narration and the prompt to build it

Two things in here. The **narration** is what gets said, written to be read out
loud at a normal speed. The **master prompt** at the bottom is what goes into
NotebookLM, along with this file and the frames in `screenshots/`.

Target: **3 minutes**. Judges watch a lot of these. Short and specific beats
long and thorough.

---

## Narration

Timings are rough. Read it like you are explaining it to a friend who works in
manufacturing, not like you are presenting to a room.

### 0:00 — 0:20 · the problem
> **[frame: 11-landing-hero-dark.png]**

A supplier sends you a letter. It says one of your parts is being discontinued,
and you have thirty-four days to place a final order.

Now someone has to work out what that actually breaks. Which products use this
part. Which customers you promised spares to. Which certificates have to be
redone. How many to buy before the door shuts.

That takes days, and it usually pulls in three people. And if you miss the date,
the part is gone. You redesign the product, or you stop building it.

### 0:20 — 0:40 · what it does
> **[frames: 01-landing-hero.png, then 02-notices-empty.png]**

This is LastBuy. You drop the letter in, and it tells you what breaks.

It reads the PDF — a scan, a photo, any language. It finds your part numbers. It
traces each one up through your bill of materials to every finished product that
contains it. Then it prices the decision: how many to buy, what that costs, and
what it protects.

### 0:40 — 1:05 · the graph
> **[frame: 20-landing-full.png — hold on the fan diagram]**

Here is the part that matters. The money is not written by a model.

One isolator sits under five finished products. We walk the bill of materials
from the part up to each of them, multiplying the quantities along the way. Five
products. Nine million euros of revenue behind them, every year.

Ask it again tomorrow and you get the same number, because it is arithmetic. The
models read documents and write the memo. They never make a number you act on.

### 1:05 — 1:25 · how it is put together
> **[frame: 20-landing-full.png — hold on the two architecture diagrams]**

Here is the whole thing on one picture. You give it two things: the letter, and
your bill of materials. Everything runs in your browser, and behind that there
are three services.

AMD reads the document and writes the words. Evolus rules on the certificates.
And the impact engine — the box on the right — never calls a model at all. That
is the one that produces the numbers.

The second picture is the decision the whole pipeline turns on. The notice comes
in, we read the form, and then we ask one question: did the page already say it?
If yes, we go straight across the top. If not, and only then, the model fills the
gap.

### 1:25 — 1:50 · a real letter
> **[frame: 13-notice-impact.png]**

We tested it on a real Hittite Microwave notice
from 2014. Four hundred and eighty-eight kilobytes, scanned.

Here is the thing we got wrong first. We sent the whole document to the model,
and the run took a hundred and sixty-one seconds. Vercel kills a request at
sixty. So it did not just cost more — it failed.

So we looked at the document again. A notice like this is a form. It ticks its
own category. It prints its last-time-buy date next to a label. So we read the
form first, and only ask the model for what the page does not say.

Twenty-seven seconds. Five parts matched. Last-time buy, second of February
twenty-fourteen, read straight off its own label. No credits spent.

### 1:50 — 2:10 · ask
> **[frame: 14-ask-in-use.png]**

You can also just ask it things. Drop in as many documents as you want and ask
across all of them at once.

Every answer tells you where it came from. If it read something in a document,
the sentence ends with the filename. If the engine computed it, it ends with
"engine". Those two never get mixed up.

And when the context window fills, we do not summarise the chat. We turn it into
claims — each one with its subject, how it is known, and which document it came
from — and then we throw the messages away. A summary cannot be checked. A claim
can.

### 2:10 — 2:30 · what it runs on
> **[frames: 03-parts.png, then 09-ask.png — the strip under the nav is on both]**

Everything runs on AMD. Gemma reads the notices and writes the memos, served on
AMD Instinct through Token Factory. MinerU does the OCR, same place. One file in
the whole repository talks to a model at all — grep it for OpenAI or Anthropic
and nothing comes back.

The certification rules come from an Evolus agent, in a workspace called lychee,
pointed at that same AMD model. It cites the standard and the clause every time,
and when the documents do not cover something, it says so instead of guessing.

### 2:30 — 2:45 · cost
> **[frame: 20-landing-full.png — hold on the cost section]**

A complete assessment costs about a hundredth of a cent.

That number matters more than it looks. Most teams triage — they only look at
the notices that seem important. That is exactly how the expensive ones get
missed. At this price, you read every single one.

### 2:45 — 3:00 · close
> **[frame: 21-landing-full-dark.png — hold on the closing line]**

Obsolescence management is already an industry. Every tool in it is a database
you search — you type in a part number, and it tells you facts about the part.

This one reads the letter and tells you what breaks.

It is live, the code is public, and every figure on screen is one you can check.

---

## Frames, in order

| # | file | what it is |
|---|---|---|
| 1 | `11-landing-hero-dark.png` | opening, dark |
| 2 | `01-landing-hero.png` | the product, light |
| 3 | `02-notices-empty.png` | the dropzone |
| 4 | `20-landing-full.png` | full page — the fan diagram, the two architecture diagrams, the cost section |
| 5 | `13-notice-impact.png` | one notice, assessed |
| 6 | `14-ask-in-use.png` | Ask, with a cited answer |
| 7 | `03-parts.png` | risk scored before any notice arrives |
| 8 | `09-ask.png` | the partner strip under the nav |
| 9 | `08-bill-of-materials.png` | bring your own BOM |
| 10 | `21-landing-full-dark.png` | closing, dark |

Also in `screenshots/`: products, suppliers, certifications, approvals, sign-in,
and full-page captures of parts, products, certifications, Ask and the importer.
Use them if a section needs more to look at.

---

## Master prompt for NotebookLM

Paste this, attach `VIDEO-SCRIPT.md`, and attach the frames from
`submission/screenshots/`.

> Make a three-minute product video for **LastBuy**, a tool for manufacturers.
>
> **Use the narration in VIDEO-SCRIPT.md as the script, close to word for word.**
> Do not rewrite it into marketing language. It is deliberately plain and spoken,
> and that is the point. If you need to trim for timing, cut whole sentences
> rather than rephrasing the ones you keep.
>
> **Voice:** one narrator. Calm and straightforward, a person explaining their
> own work. Not an advertisement. No hype, no rising excitement at the end,
> slightly dry. Where a number appears, say it plainly and let it sit.
>
> **Pictures:** use the attached screenshots in the order the script marks them.
> They are real captures of the running product at 1920x1080 — show them full
> frame and let them hold. A slow pan down the tall full-page captures
> (`20-landing-full`, `21-landing-full-dark`) is good. Everything else should be
> static or very nearly. No zoom bounces, no sliding transitions, no stock
> footage, no generic "AI" or "technology" imagery, and no music that builds.
>
> **Look:** the product is black on white with one red accent, and dark grey with
> one orange accent. Match that. Open and close on the dark frames and keep the
> middle light. Any text you put on screen should be plain sans-serif, small, and
> in a corner — the screenshots are the content, not a backdrop for captions.
>
> **Highlight what is being said.** This is the important one. When the narration
> names something that is visible on screen, draw attention to that exact part of
> the image while the line is being read — a soft rectangle around it, a dimming
> of everything else, or a slow push in on that region. Some examples:
>
> - "sign in" or "an account" → the sign-in panel
> - "drop the letter in" → the dropzone
> - "five products" → the five product boxes at the right of the fan diagram
> - "twenty-seven seconds" → the timing row in the pipeline diagram
> - "the impact engine never calls a model" → that box in the architecture diagram
> - "ends with the filename" → the bracketed source at the end of Vigil's answer
> - "a hundredth of a cent" → the cost figure
>
> One highlight at a time, appearing as the words are said and fading when the
> sentence ends. Never highlight something the narrator is not talking about, and
> never leave three boxes lit at once — the point is to put the viewer's eye in
> the right place, not to decorate the frame.
>
> **Pacing:** about twenty to twenty-five seconds a section, nine sections. Leave
> a breath between sections rather than cutting straight through.
>
> **Do not:** add a logo animation, add a call-to-action card at the end, add
> captions that restate the narration word for word, speed up or time-lapse the
> screenshots, or put a presenter on screen.
