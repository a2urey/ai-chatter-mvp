# ai-chatter-mvp

Hybrid KOL chat MVP with:
- LLM-first response orchestration
- deterministic policy/fallback guardrails
- click-to-unlock WhatsApp funnel
- baseline vs hybrid evaluation scripts

## Run

```bash
npm start
```

Open `http://127.0.0.1:4173/`.

## Hybrid Runtime Config

Environment variables:

- `HYBRID_MODE` (default `true`)
- `LLM_PROVIDER` (default `openai`, supports `openai`, `deepseek`, `mock`)
- `LLM_API_KEY` (generic key env, highest priority)
- `OPENAI_API_KEY` (used when provider is `openai`)
- `DEEPSEEK_API_KEY` (used when provider is `deepseek`)
- `LLM_MODEL` (generic model env; defaults by provider)
- `LLM_BASE_URL` (generic base URL env; defaults by provider)
- `LLM_TIMEOUT_MS` (default `7000`)
- `LLM_MAX_RETRIES` (default `1`)
- `LLM_TEMPERATURE` (default `0.8`)
- `REPETITION_THRESHOLD` (default `0.78`)
- `MAX_HISTORY_MESSAGES` (default `12`)

When LLM is unavailable or rejected by guardrails, system falls back to deterministic scripted replies.

Example (DeepSeek):

```bash
export LLM_PROVIDER=deepseek
export DEEPSEEK_API_KEY="your-key"
export LLM_MODEL="deepseek-chat"
# optional: export LLM_BASE_URL="https://api.deepseek.com"
```

## Eval

Run:

```bash
npm run eval
npm run eval:review
```

The report compares `baseline_script_only` vs `hybrid_llm_mock` and includes fallback scenario coverage.

## Audit Logs (session-level)

Every `POST /api/chat/respond` call is automatically persisted for debugging and review.

Stored files:

- `logs/chat-audit/all-sessions.jsonl`
- `logs/chat-audit/<sessionId>.jsonl`

Each event includes:

- `sessionId`
- full `history` sent by client (all dialogue content)
- `timestamp`
- model/fallback source (`generationSource`)
- fallback/guardrail reasons
- structured `decisionTrace` (policy branch + routing rationale)

Read APIs:

- `GET /api/audit/sessions`
- `GET /api/audit/session/<sessionId>`
