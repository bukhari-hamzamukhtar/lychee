# Where the models run, and what that qualifies for

## The AMD requirement is already met

AMD is mandatory for every track. Every model call in this application goes to
AMD Token Factory:

```
https://developer.amd.com.cn/radeon/api/v1
```

`lib/amd.ts` is the only file that reaches an inference provider, and the
endpoint is named at the top of it. The two ways out are `ocr()` and `chat()`.
There is no OpenAI, no Anthropic, no other hosted model anywhere in the
codebase. The Evolus agent is bound to that same AMD endpoint as a custom model,
so its answers are generated on AMD as well.

This was confirmed by an AMD mentor in the event Discord, twice, in answer to
exactly this question:

> *"yes, that's exactly is the AMD infra requirement. Tokenfactory points to
> those urls. You need to highlight in your code the api requests using
> developer.amd.com"*

> *"Yes, that's the official way of counting it as meaningful AMD usage"*

**So no GPU droplet is needed to satisfy the AMD or Evolus requirements.** That
was an earlier reading of the written rules; the organisers' answer supersedes
it. Do not spend the money or the hour on it for that reason.

## The Google prize is a different matter

Google DeepMind joined as a technology partner partway through the event, with a
dedicated prize for teams building with **Gemma**, "running on AMD GPUs in the
cloud using AMD Developer Cloud and ROCm."

We cannot currently reach Gemma at all.

| when | what the catalogue listed |
|---|---|
| 14 Oct | `Gemma-4-31B-IT` present, but degenerating — repeated fragments, leaked `<\|tool_call>` |
| 15 Oct ~20:50 | `Gemma-4-31B-IT` present in `/models`, 12 models total |
| 15 Oct ~21:50 | **gone.** 11 models, nothing matching `/emma/i`, three consecutive checks |

Asking for it by name now returns `400 Requested model Gemma-4-31B-IT not
supported`, and every prefixed variant (`self-dploy/`, `google/`, lowercase)
returns 404. Others in the Discord were reporting
`Error from provider self-dploy: 503 Service Unavailable` on it through the
afternoon, so this looks like AMD pulling a model that was misbehaving rather
than anything on our side.

Reproduce with `npx tsx scripts/probe-gemma-id.ts`.

**This means the only remaining route to the Google prize is serving Gemma
ourselves on an AMD Developer Cloud droplet** — which is, word for word, what
the announcement describes.

## Serving Gemma ourselves, if we go for it

### What it costs

| | |
|---|---|
| AMD AI Developer Program | free to join, grants **$100 credits** (~50 h on one MI300X) |
| Payment method | **required on file** — the droplet button stays greyed out without one |
| 1× MI300X (192 GB) | **$1.99/hour** |
| Realistic spend | stand it up the day before judging, destroy after: **2–3 h, ~$5** |

**Destroying the droplet stops billing. Powering it off does not.**

Credits are distributed on a rolling basis within 48 hours of completing
hackathon registration, AMD registration *and* team registration — all three.
With the deadline on 18 October, check whether they have landed before planning
around them.

### The steps

**1.** Create a GPU droplet: one MI300X, region ATL1, the **vLLM** quick-start
image, SSH key added at creation.

**2.** Serve Gemma. Confirm the exact model id on Hugging Face first — the
catalogue name AMD used (`Gemma-4-31B-IT`) is not necessarily the upstream repo
path, and a wrong id fails after the download rather than before it.

```bash
ssh root@<droplet-ip>
docker exec -it rocm /bin/bash

python -m vllm.entrypoints.openai.api_server \
  --model <the-verified-gemma-repo-id> \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype bfloat16 \
  --api-key lastbuy-<something-long-and-random> \
  --tool-call-parser hermes \
  > /tmp/vllm.log 2>&1 &

tail -f /tmp/vllm.log     # wait for "Application startup complete."
```

- `--host 0.0.0.0` — without it vLLM listens only inside the container and
  nothing outside the droplet can reach it. This is the usual failure.
- `--api-key` — vLLM takes no auth by default and the container maps the port
  straight through iptables, so it is reachable from the open internet. An
  unauthenticated GPU on a public IP is somebody else's free inference.
- `--tool-call-parser hermes` — Evolus agents use tool calls. Ours does not
  need them, but it is the documented thing people miss and it costs nothing.

**3.** Check it before changing anything else:

```bash
npx tsx scripts/probe-vllm.ts http://<droplet-ip>:8000/v1 <the-api-key>
```

It reports whether the endpoint is reachable, which model id it actually answers
to, whether the key is accepted, and whether tool calls work.

**4.** Point this application's generation at it. One line, no code change:

```bash
AMD_GENERATE_BASE_URL=http://<droplet-ip>:8000/v1
AMD_GENERATE_API_KEY=lastbuy-<the-key>
AMD_MODEL_GENERATE=<the-verified-gemma-repo-id>
```

`lib/amd.ts` splits generation from OCR, so this moves memos, drafts, notice
normalisation and the Ask agent onto Gemma on our own AMD GPU, while OCR stays
on Token Factory — MinerU is not something vLLM will give us, and the notice
pipeline needs it.

**5.** Optionally point the Evolus agent at the same endpoint, in *Settings →
Your models*. No API reads back which model an agent is bound to, so this has to
be done and screenshotted in the console.

**6.** Afterwards, destroy the droplet. Not power off.

### Known risk

vLLM serves plain **HTTP** on a droplet IP. Evolus is a hosted service and may
refuse a non-HTTPS model endpoint. Our own application has no such problem — it
calls the droplet server-side. So if Evolus rejects it, Gemma still runs the
application's generation and the Google claim stands; only the agent stays on
Token Factory. Find out early rather than on the last evening.

### If it dies mid-demo

Unset `AMD_GENERATE_BASE_URL` and redeploy. Generation falls back to Token
Factory with no code change.

Worth saying plainly in the submission either way: **the impact figures do not
depend on any model being up.** They are graph traversals over the bill of
materials. A model that is down costs you the memo, not the number.
