# Diagram prompts for ChatGPT

Four prompts, one image each. Paste them one at a time into a fresh ChatGPT image
chat. Attach `assets/title-image1.png` (the LastBuy mark) to the first one so the
logo stays the same across all four.

Every prompt ends with the same **house rules** block. Keep it on every prompt —
image models forget earlier messages.

---

## 1 · System architecture

```
Make a clean, modern software architecture diagram for a product called
LastBuy. 16:9, landscape, 1920x1080. White background.

Layout, left to right in three columns, with generous white space:

LEFT COLUMN — heading "You supply"
  • A document icon (a PDF page with a red corner fold) labelled
    "Supplier notice"
  • A spreadsheet icon (a CSV grid) labelled "Bill of materials"

CENTRE — heading "LastBuy"
  • A browser window frame. Inside it, the LastBuy logo (attached: a round
    clock face whose two hands form the letter L, with a small leaf sprouting
    from the top, like a lychee). Under the logo: "LastBuy".
  • Small badges along the bottom of the browser frame: the official Next.js
    logo and the official Vercel logo.
  • In the bottom-left corner of the browser window, a small hooded figure
    holding a glowing lantern, labelled "Vigil". This is the assistant that
    floats on every screen.

RIGHT COLUMN — heading "Behind it", three stacked cards:
  1. The official AMD logo, with "AMD Instinct" under it. Inside the card two
     small chips: "MinerU2.5-Pro" and the official Google Gemma logo with
     "Gemma-4-31B-IT".
  2. The official Evolus logo, with "workspace: lychee". Three small chips:
     "Agent", "AI Tools", "Knowledge library".
  3. A gear-and-graph icon, "Impact engine". One chip: "no AI model".

Arrows (each one must carry its label, written small, right on the arrow):
  • Supplier notice → LastBuy : "upload"
  • Bill of materials → LastBuy : "loaded once"
  • LastBuy → AMD card : "read + write"
  • LastBuy → Evolus card : "rule on certificates"
  • LastBuy → Impact engine : "trace the part"
  • Impact engine → back to LastBuy, a curved return arrow in red :
    "what breaks + what it costs"

Make the path a notice takes (upload → LastBuy → AMD → Impact engine →
back) red #D62D12. Every other arrow is thin grey #8A9099.

[HOUSE RULES — paste below]
```

---

## 2 · What happens to a notice

```
Make a horizontal flowchart, 16:9, 1920x1080, white background, showing how
one supplier letter is processed. Read left to right.

Top row, the main path, each step a rounded card with an icon:
  1. A scanned paper letter icon — "The letter"
  2. The official AMD logo — "MinerU2.5-Pro" (small tag: "27s")
  3. A magnifying glass over a form with a ticked checkbox — "Read the form"
     (three tiny tags under it: "ticked box", "date", "part numbers")
  4. A decision DIAMOND — "Did the page say it?"
  5. A tree/hierarchy icon — "Match bill of materials"
  6. A red alert/target icon — "Impact"

From the diamond:
  • to the RIGHT, a thick red arrow labelled "yes" → step 5 → step 6
  • DOWN, a dashed grey arrow labelled "no" → a lower row:
      a. the official Evolus logo — "doc-structure" (tag "10s")
      b. the official Google Gemma logo — "Gemma normalise" (tag "17s")
      then a dashed grey arrow that climbs back up into step 5.

Along the very bottom, two short result pills side by side, no sentences:
  • red pill: "yes → 27s · 0 credits · $0"
  • grey pill: "no → 54s · 10.6 credits"

Label every arrow. The "yes" path is the hero: thick, red #D62D12, solid.
The "no" path is thin, grey, dashed.

[HOUSE RULES — paste below]
```

---

## 3 · What Vigil remembers

```
Make a diagram, 16:9, 1920x1080, white background, showing how an AI
assistant keeps what matters when its memory fills up. Left to right.

1. A chat window with many stacked speech bubbles — "Conversation"
   (small tag: "12 messages")
2. A funnel or distillation icon — "Distil"
3. A neat stack of index cards. On each card one short line and a small
   source chip:
     "plating change"       chip: "PDF"
     "last buy 2014-02-01"  chip: "PDF"
     "under RF front end"   chip: "engine"
   Label the stack "Claims, with sources".
4. A fork / branching icon — "Fork"
5. A fresh, empty chat window with the index-card stack pinned to its side —
   "New conversation"

Under step 1, a dashed arrow going down into a small rubbish-bin icon,
labelled "thrown away".

Arrows and labels:
  • Conversation → Distil : "window full"
  • Distil → Claims : "keep"
  • Claims → Fork : "carry over"
  • Fork → New conversation : "empty window"
  • Conversation → bin : "thrown away"

The keep / carry-over path is red #D62D12. The thrown-away path is grey and
dashed. The hooded lantern-holding character "Vigil" can sit small in the
top-left corner, watching over the chat.

[HOUSE RULES — paste below]
```

---

## 4 · How Vigil answers

```
Make a diagram, 16:9, 1920x1080, white background, showing how an in-app AI
assistant called Vigil answers a question. Vigil is a small hooded figure
holding a glowing lantern.

Centre: Vigil, larger, holding the lantern.

Feeding INTO Vigil from the left, three sources, each a small card with an
icon:
  • A screenshot-of-a-screen icon — "What's on screen"
  • A blueprint / gear icon — "How the system works"
  • A stack of documents icon — "Your documents"

Vigil sends a question to the RIGHT, to a card with the official AMD logo and
the official Google Gemma logo — "Gemma on AMD".

The answer comes back to a chat bubble on the far right — "Answer". Inside
the bubble, show two tiny source tags at the end of a line of text: "[PDF]"
and "[engine]", to show every answer says where it came from.

Above Vigil, a small padlock icon with a person silhouette — "sign in to ask".

Arrows and labels:
  • each source → Vigil : "context"
  • Vigil → Gemma on AMD : "ask"
  • Gemma on AMD → Answer : "cited answer"
  • padlock → Vigil : "account"

The ask/answer path is red #D62D12. The context arrows are thin grey.

[HOUSE RULES — paste below]
```

---

## House rules — paste this under every prompt

```
HOUSE RULES (follow all of them):
- Use the real, official logos for AMD, Google Gemma, Evolus, Next.js and
  Vercel wherever they are named. Do not invent look-alike logos.
- Every arrow carries a short label of one to four words, written small and
  placed right on or beside its arrow. Never leave an arrow unlabelled.
- No sentences, no paragraphs, no captions, no descriptive text blocks. Only
  the short names and labels given above. No title banner across the top.
- Spell every label exactly as written. Do not add words.
- Flat, clean, modern product-diagram style, like a polished engineering
  slide from a top tech company. Crisp vector look, soft shadows at most.
- Palette: white background, near-black text #111317, one accent red
  #D62D12 for the main path only, mid grey #8A9099 for everything secondary.
  No gradients, no neon, no glow, no purple.
- Plenty of white space. Nothing touching the edges. Elements aligned to a
  clear grid, evenly spaced.
- Text must be sharp and legible at 1920x1080.
```
