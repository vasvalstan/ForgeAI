# Backend Future Notes

## Current Fit

The current backend architecture is valid for the next stage of ForgeAI.

- `Next.js` handles product APIs and authentication.
- `Motia` handles backend orchestration and API endpoints.
- Python steps handle LLM and agent workloads.
- `Postgres`/`Neon` is the durable system of record.

This is a reasonable architecture for an early B2B product and does not need an immediate framework rewrite.

## What Should Scale Fine For Now

This setup should scale acceptably in the near term if usage remains moderate and most heavy work stays asynchronous.

- Board CRUD and auth in the web app
- Agent jobs triggered through backend endpoints
- Python workers doing LLM analysis
- Postgres storing discoveries, conversations, specs, tasks, and tenant data

This remains workable if:

- most heavy work is backgrounded
- agent latency does not need to be fully synchronous
- Python steps stay mostly stateless
- database schema and authorization remain disciplined

## What Will Need Improvement

The likely future work is architectural hardening, not a full rewrite.

### Queueing And Workers

As usage grows, ForgeAI will need a more explicit production job model.

- reliable queues
- retries
- dead-letter handling
- idempotency
- job status tracking
- backpressure handling

BullMQ should become a deliberate production dependency rather than just an available plugin.

### Separate Python Worker Scaling

If Python agent workloads become the bottleneck, split them into independently scalable worker processes or a dedicated Python service.

This should happen only when Python throughput or isolation becomes a real problem.

### Object Storage

Files, transcripts, generated images, and large artifacts should live in object storage, with metadata in Postgres.

Postgres should remain the metadata and business-state store, not the long-term file bucket.

### Observability

Once production usage grows, the system needs better operational visibility.

- tracing
- structured logs
- job failure monitoring
- per-tenant usage metrics
- latency and throughput dashboards

### Internal Service Auth

The internal secret approach is a good start, but over time service-to-service auth should become stricter and more standardized.

### Realtime Durability

Presence and transient collaboration state can remain in Liveblocks.

Business-critical state should stay durable in Postgres or another owned store. Transport or in-memory fallback layers should not be the source of truth for tenant-critical data.

### Credits And Billing

Organization-level credits are the right direction for B2B.

Later, ForgeAI may need:

- subscriptions
- seat-based billing
- usage metering
- quotas
- feature-level limits

## When Bigger Changes Make Sense

A larger backend redesign is worth considering only if one of these becomes true:

1. Python becomes the main backend, not just the worker layer.
2. Workflow orchestration, retries, and scheduling outgrow Motia comfortably.
3. API, orchestration, and inference workers need independent scaling.
4. Enterprise customers require stronger auditability, controls, and service guarantees.

If that happens, the likely move is not a full rewrite. A more realistic transition would be:

- keep product and auth APIs in `Next.js` or a TypeScript API service
- keep Postgres as the source of truth
- move heavy agent execution into dedicated Python workers or a dedicated Python service
- use a stronger queue and job model around those workers

## Recommendation

For now, keep the current backend direction.

There is no strong reason yet to switch to `FastAPI`, `Flask`, or a fully Python-native backend unless the product becomes Python-first.

The better near-term path is to harden the existing architecture:

- add proper org/member/invitation APIs
- formalize job status tracking for agent runs
- move uploads and generated artifacts to object storage
- make Redis/BullMQ a first-class production dependency
- add monitoring, retries, and failure visibility
- make backend deployment and scaling on Railway explicit

## Bottom Line

The current architecture should scale for a while with what ForgeAI has today, but future changes will still be needed.

Those future changes are mostly about operational maturity, worker isolation, storage strategy, and queueing discipline, not an immediate framework replacement.
