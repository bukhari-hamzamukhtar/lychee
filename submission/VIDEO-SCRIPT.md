# Video: script, frames, and the prompt to build it

Things in here:

1. **The script.** What gets said, line by line, with the frame on screen and
   what to highlight while each line is spoken.
2. **The frames.** All in `submission/screenshots/`, 1920x1080.

Length: about **3 minutes**. Ten short parts.

The rendered video is `submission/LastBuy-demo.mp4`, with subtitles in
`LastBuy-demo.srt`. It is built from this script by `video/`: `python
narrate.py` makes the voice and the timings, `npm run render` makes the video.

Every number in here comes from the engine running the example factory. They
match the site, the deck and the screenshots: 3 assemblies, 5 products,
€9.06M a year, 34 days, 504,798 units, €1,433,626.

---

## The script

Read it like you are explaining it to a friend who works in a factory.
Short sentences. Let the numbers sit for a second.

---

### 1 · The hook (0:00 – 0:15)

**Frame:** `11-landing-hero-dark.png`

> A supplier sends you a letter.
> One of your parts is being discontinued.
> You have thirty-four days to place one last order.
> After that, it's gone for good.

**Highlight:** the headline, *"before the window shuts"* in red.

---

### 2 · The problem (0:15 – 0:35)

**Frame:** `49-landing-the-problem.png`

> The letter is one line. The hard part is what it breaks.
>
> This one chip, ADUM1201ARZ, sits inside three assemblies.
> Those go into five products.
> And those five products bring in nine million euros a year.
>
> Today, someone works that out by hand, in spreadsheets, before the date.

**Highlight, one at a time, as each number is said:**
"three assemblies" → the **3** row · "five products" → the **5** row ·
"nine million euros" → the **€9.06M** row · "before the date" → the red **34 days** row.

---

### 3 · What LastBuy is (0:35 – 1:00)

**Frames:** `01-landing-hero.png` for the first line, then `30-diagram-system.png`

> This is LastBuy. It reads the letter, traces the part through everything you
> build, and tells you what to buy.
>
> You give it two things. The letter, and your bill of materials.
>
> Behind it, AMD does the reading and writing. MinerU reads the scan. Gemma 4
> writes the words. Both run on AMD Instinct, through AMD's Token Factory.
>
> Evolus, in our workspace called lychee, rules on the certificates.
>
> And the impact engine does the maths. That box is plain code. No model.

**Highlight:**
"two things" → the **Supplier notice** and **Bill of materials** cards on the left ·
"AMD" → the **AMD Instinct** card, with **MinerU2.5-Pro** and **Google Gemma** inside it ·
"Evolus" → the green **evolus** logo and **workspace: lychee** ·
"plain code" → the **Impact engine** card and its **Deterministic** chip ·
then the red return arrow, **what breaks + what it costs**.

---

### 4 · A real example arrives (1:00 – 1:20)

**Frames:** `40-worked-01-a-letter-arrives.png`, then `45-notice-the-numbers.png`

> Here's a worked example. A notice from Analog Devices comes in. It's in German.
>
> LastBuy reads it and finds the part in your bill of materials.
>
> Thirty-four days to the last buy. The stock you have runs out in under five
> weeks. You need to buy five hundred and four thousand units. That's one point
> four million euros.

**Highlight:**
"Analog Devices" → the top row, **PCN-ADI-2026-4471**, and its red **34d to last buy** ·
"in German" → the **As it arrived** box with the German text ·
"thirty-four days" → **34d** · "under five weeks" → **4.7 wk** ·
"five hundred and four thousand" → **504,798** · "one point four million" → **€1,433,626**.

---

### 5 · Why: the graph (1:20 – 1:40)

**Frame:** `46-notice-what-breaks.png`

> Where does that come from? This graph.
>
> It starts at the chip, goes through the two boards it sits on, and up to all
> five products. On each path it multiplies how many go into one unit.
>
> Every line here is arithmetic. You can check it. Ask again tomorrow and you get
> the same answer.

**Highlight:**
"the chip" → the red **ADUM1201ARZ** node on the left ·
"the two boards" → **ASM-CTRL-B** and **ASM-GATE-D** ·
"all five products" → the five nodes on the right, **HMI-7** to **SRV-100** ·
"multiplies" → the **7 per unit** and **13 per unit** labels ·
"you can check it" → the path rows underneath, like **ADUM1201ARZ → ASM-GATE-D → ASM-PWR-A → MD-3000**.

---

### 6 · How the letter is read (1:40 – 2:00)

**Frame:** `31-diagram-notice.png`

> How does it read the letter so fast? A notice is a form.
> It ticks its own box. It prints the last-buy date next to a label.
>
> So we read the form first. If the page says it, we go straight across the top.
> Twenty-seven seconds. No credits.
>
> If the page doesn't say it, Evolus and Gemma fill the gap. About fifty-four
> seconds. Either way, you get an answer.

**Highlight:**
"a form" → **Read the form** and its three tags, **ticked box · date · part numbers** ·
"if the page says it" → the **Did the page say it?** diamond ·
"straight across the top" → the red **yes** arrow to **Match bill of materials** ·
"twenty-seven seconds" → the red pill, **yes: 27s, 0 credits, $0** ·
"Evolus and Gemma" → the two cards on the lower row ·
"fifty-four seconds" → the grey pill, **no: 54s, 10.6 credits**.

---

### 7 · The order, and who signs it (2:00 – 2:15)

**Frame:** `47-notice-the-order.png`

> The order size depends on two things. How long you keep supplying spares,
> and how much extra you keep as a buffer. Move them, and the number moves.
>
> Then a real person approves it. Nothing gets ordered on its own.

**Highlight:**
"how long" → the **Service commitment** slider, **3 years** ·
"buffer" → the **Spares buffer** slider, **10%** ·
"the number moves" → the **ORDER 504,798** figure on the right ·
"a real person" → the **Run the agent / Assess notice** row at the bottom.

---

### 8 · Vigil (2:15 – 2:35)

**Frames:** `44-worked-05-ask-with-sources.png`, then `14-ask-in-use.png`

> This is Vigil, the assistant. It sits on every page.
>
> Ask it anything, across all your documents at once.
> Every claim ends with where it came from. The file name, if it read it.
> "Engine", if it worked it out.
>
> And if your documents don't say, it tells you that. It doesn't guess.

**Highlight:**
"every page" → the **Ask Vigil** button, bottom left of `14-ask-in-use.png` ·
"the file name" → **[PCN140002.pdf]** at the end of a sentence ·
"engine" → **[engine]** at the end of the last sentence ·
then, on the second frame, the **Documents** list on the right.

---

### 9 · What Vigil remembers (2:35 – 2:48)

**Frame:** `32-diagram-memory.png`

> When a chat gets long, Vigil doesn't just summarise it.
> It turns it into claims, each with its source. Then it throws the chat away.
>
> Start a new chat, and it still knows the claims.
> A summary can't be checked. A claim with a source can.

**Highlight:**
"when a chat gets long" → **Conversation, 12 messages** ·
"claims, each with its source" → the three cards, each with **PDF** or **engine** ·
"throws the chat away" → the bin, **thrown away** ·
"a new chat" → **Fork**, then **New conversation** with the claims pinned beside it.

---

### 10 · Cost, and the close (2:48 – 3:05)

**Frames:** `50-landing-cost.png`, then `51-landing-close-dark.png`

> A full assessment costs about a hundredth of a cent.
> So you can read every notice, not only the ones that look important.
> That's how the expensive ones get missed.
>
> Tools in this space today are databases you search.
> LastBuy reads the letter and tells you what breaks.
>
> Built on Gemma 4 on AMD, with Evolus. Made by Hamza Bukhari. Thanks for watching.

**Highlight:**
"a hundredth of a cent" → the red **$0.00012** ·
"every notice" → the four notices on the right, under **On watch** ·
on the dark frame, "reads the letter and tells you what breaks" → the red line,
**This one reads the letter and tells you what breaks.**

---

## Frames, in the order they are used

| part | file | what it shows |
|---|---|---|
| 1 | `11-landing-hero-dark.png` | the opening, dark |
| 2 | `49-landing-the-problem.png` | one part, traced: 3 / 5 / €9.06M / 34 days |
| 3 | `01-landing-hero.png` | the landing page, light, with the system diagram |
| 3 | `30-diagram-system.png` | **system architecture**, with the AMD, Gemma and Evolus logos |
| 4 | `40-worked-01-a-letter-arrives.png` | worked example: three notices arrive |
| 4 | `45-notice-the-numbers.png` | the German notice, and 34d / 4.7 wk / 504,798 / €9,058,546 |
| 5 | `46-notice-what-breaks.png` | the graph from the chip to all five products |
| 6 | `31-diagram-notice.png` | **what happens to a notice**: the yes path and the no path |
| 7 | `47-notice-the-order.png` | the two assumptions, and the order they make |
| 8 | `44-worked-05-ask-with-sources.png` | a Vigil answer with its sources |
| 8 | `14-ask-in-use.png` | the Ask screen, in use |
| 9 | `32-diagram-memory.png` | **what Vigil remembers** |
| 10 | `50-landing-cost.png` | the cost, and Vigil on watch |
| 10 | `51-landing-close-dark.png` | the closing line, dark |

**Spare frames,** if a part needs more to look at:
`41-worked-02-what-it-breaks.png` (the numbers as a list),
`42-worked-03-parts-ranked.png` (every part scored before any letter comes),
`43-worked-04-products-at-risk.png` (revenue per product),
`03-parts.png`, `04-products.png`, `06-certifications.png`, `07-approvals.png`,
`08-bill-of-materials.png` (bring your own BOM), `10-sign-in.png`,
and the full-page captures `20` to `27`.

