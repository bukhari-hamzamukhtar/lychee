# Evolus API — working notes

Researched 2 Oct 2026 from evolus.ai/developers so we don't re-derive it on day one.
Verify against the interactive API reference inside the workspace once the event code
is redeemed.

## Base URLs

| Purpose | URL |
|---|---|
| REST API | `https://api.evolus.ai/api/v1` |
| Agent chat (OpenAI-compatible) | `https://api.evolus.ai/v1` |
| MCP server | `https://api.evolus.ai/mcp` |

## Auth

- Application key: headers `X-ApiKey` + `X-Application-Id`
- User key: headers `X-User-ApiKey` + `X-Application-Id`
- Agent chat: `Authorization: Bearer <application API key>`

## Endpoints we need

### Workflows (business automations)
```
POST /api/v1/workflows/{workflowId}/execute          -> 202 Accepted + execution id
GET  /api/v1/workflows/{workflowId}/executions/{id}  -> poll until Completed | Failed
```
Accepts text and files. Can also start from incoming email or a schedule.

### Document extractors
```
POST /api/v1/agents/{agentId}/json/{extractorId}/ask-file
POST /api/v1/agents/{agentId}/json/{extractorId}/ask-files   (batch)
```
`/csv/` and `/text/` variants exist for other output shapes.

### AI Tools (11 ready-made)
```
GET  /api/v1/ai-tools                    -> catalogue + parameters
POST /api/v1/ai-tools/{tool}/run         -> text in, JSON body
POST /api/v1/ai-tools/{tool}/run-media   -> audio / video / documents
POST /api/v1/ai-tools/{tool}/run-file    -> file in, file out (translate, anonymise)
```
The two that matter for the demo: **translate PDF/Word keeping layout** (Italian OEM
manual to the technician's language) and **meeting minutes from audio** (voice note to
structured work order).

### Knowledge libraries (RAG)
```
POST /api/v1/memories/{libraryId}/documents
POST /api/v1/memories/{libraryId}/documents/import-url
GET  /api/v1/memories/{libraryId}/documents
```
Agents answer from these **with sources** — that is what makes the citations in the
work order real rather than decorative.

### Agent chat
```
GET  /v1/models                -> lists agents
POST /v1/chat/completions      -> model = "<applicationId>:<agentId>"
```
Response carries `X-Conversation-Id` for multi-turn.

## Event workspace limits

- 50,000 platform credits
- **60 requests / minute** — a real design constraint, batch where possible
- up to 6 members
- free until 15 Nov 2026

## Track requirements (what gets audited)

The Evolus team verifies by inspecting workspace config and API usage statistics:

1. Built in the **free event workspace** (code issued at kickoff)
2. Main agent runs an **open model served on AMD** — Fireworks AI or own vLLM on
   AMD Developer Cloud
3. **At least two** building blocks — we plan five: workflow, knowledge library,
   extractor, AI Tools, MCP connector
4. Driven **through the APIs**, not clicked together in the UI
5. Containerized app, public GitHub repo, README that runs
6. **Never commit API keys** — use environment variables

## BYO model

Any OpenAI-compatible endpoint. Configure in workspace settings: base URL, model name,
API key, then test the connection before assigning it to agents.

For a self-hosted vLLM endpoint, serve with `--tool-call-parser hermes` — Evolus agents
need working tool calls, and this is the setting that bites people.
