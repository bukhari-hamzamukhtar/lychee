# Serving the agent's model yourself, on AMD Developer Cloud

## Why this exists

The Evolus track is audited on one thing in particular: the main agent has to
answer from **an open model served on AMD**. The published wording names two ways
of getting there — Fireworks AI, or your own vLLM endpoint on AMD Developer Cloud.

Today the agent answers from **AMD Token Factory**, which is AMD's own hosted
inference running open models on AMD Instinct GPUs. That is an open model served
on AMD by any reading, and it is arguably *more* first-party than the two named
options. But it is not one of the two named options, and a reviewer working from
a checklist may not make that leap for us.

This document is how to close the gap for certain. It is about an hour of work
and roughly $4 of the $100 free credits, and nothing in the application needs to
change.

## What it costs

| | |
|---|---|
| AMD AI Developer Program | free to join, grants **$100 credits** (~50 h on one MI300X) |
| Payment method | **required on file** — the droplet button stays greyed out without one |
| 1× MI300X droplet | **$1.99/hour** |
| Realistic spend | spin up the day before judging, destroy after: **2–3 hours, ~$5** |

**Destroying the droplet stops billing. Powering it off does not.** This is the
only way to be surprised by the bill.

## The steps

**1. Create the droplet.** One MI300X, region ATL1 (Atlanta — it has the most
reliable availability), and the **vLLM** quick-start image. Add an SSH key during
creation; password login is not offered.

**2. Start the model.**

```bash
ssh root@<droplet-ip>
docker exec -it rocm /bin/bash

python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype float16 \
  --api-key lastbuy-<something-long-and-random> \
  --tool-call-parser hermes \
  > /tmp/vllm.log 2>&1 &

tail -f /tmp/vllm.log      # wait for "Application startup complete."
```

Three flags earn their place:

- `--host 0.0.0.0` — without it vLLM listens only inside the container and
  nothing outside the droplet can reach it. This is the usual failure.
- `--api-key` — vLLM takes no auth by default, and the port is reachable from
  the open internet because the container maps it straight through iptables.
  An unauthenticated GPU on a public IP is somebody else's free inference.
- `--tool-call-parser hermes` — Evolus agents use tool calls. Our own agent
  happens not to need them, but this is the documented thing people miss and it
  costs nothing to set.

**3. Check it before touching Evolus.**

```bash
npx tsx scripts/probe-vllm.ts http://<droplet-ip>:8000/v1 <the-api-key>
```

It checks reachability, which model id the server actually answers to (vLLM
wants the full Hugging Face path, not the short name), whether the key is
accepted, and whether tool calls work. Doing this first means any failure has one
obvious cause, instead of arriving as an Evolus error message.

**4. Point Evolus at it.** In the event workspace: *Settings → Your models → add
model*, with the base URL `http://<droplet-ip>:8000/v1`, the model id the probe
printed, and the key. Test the connection there, then open the **Obsolescence
Analyst** agent and assign that model to it.

This is the step that actually satisfies the track, and it is also the one with
no API behind it — there is no endpoint that reads back which model an agent
uses, so it has to be done and confirmed in the console. Take a screenshot of the
agent with the model assigned; it is the only evidence that exists.

**5. Optionally route the app's generation there too.**

```bash
AMD_GENERATE_BASE_URL=http://<droplet-ip>:8000/v1
AMD_GENERATE_API_KEY=lastbuy-<the-key>
AMD_MODEL_GENERATE=Qwen/Qwen2.5-7B-Instruct
```

`lib/amd.ts` splits generation from OCR, so this moves memos, drafts, notice
normalisation and the Ask agent onto your own endpoint while OCR stays on Token
Factory — MinerU is not something vLLM will give you, and the notice pipeline
needs it.

Not required by the track, which only asks about the agent. Worth doing because
"the model is ours, on AMD hardware we started" is a stronger sentence than "the
agent's model is", and because it is one line to undo.

**6. Afterwards, destroy the droplet.** Not power off.

## If the droplet dies mid-demo

Unset `AMD_GENERATE_BASE_URL` and redeploy: generation falls straight back to
Token Factory with no code change. The Evolus agent would still be pointed at a
dead endpoint, but the application degrades rather than breaking — assessment
failures are already non-fatal, and the impact figures, which are the part that
matters, are graph traversals that never touch a model at all.

That property is worth stating plainly in the submission: **the numbers do not
depend on any model being up.**

## What to claim

Say what is true and let it be judged:

> The main agent answers from an open model served on AMD. Generation runs on
> `<model>` served through our own vLLM endpoint on an AMD Developer Cloud
> MI300X droplet; document OCR runs on MinerU2.5-Pro on AMD Token Factory,
> because MinerU is only available there.

If the droplet is not stood up, the honest version is:

> Every model call runs on AMD Token Factory — AMD's own inference service,
> serving open models on AMD Instinct GPUs. The Evolus agent is bound to that
> endpoint as a custom model rather than to an Evolus-chosen default.
