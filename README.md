# Microservices Architecture — Collection & Finance

## Overview ⚙️
This repository contains a small Node.js microservices architecture consisting of two services:

- **collection-service** — responsible for collection-related operations and publishing events when collections are created/updated.
- **finance-service** — consumes collection events to perform finance-related tasks (e.g., reconcile, create invoices).

Services communicate asynchronously via **Redis Streams**, which act as a lightweight event bus. Redis Streams provide persistence, consumer groups, and good support for at-least-once delivery semantics.

---

## Repo layout

```
collection-service/
  app.js
  package.json
  controllers/
    collectionController.js
  models/
    collectionModel.js
  routes/
    collectionRoutes.js
  services/
    eventService.js
    redis.js

finance-service/
  app.js
  package.json
  controllers/
  models/
    financeModel.js
  services/
    consumerService.js
    redis.js
```

---

## Design & Event Flow 🔁

1. When the API in `collection-service` creates/updates a collection, it publishes an event to a Redis Stream (e.g., `stream:collections`).
2. `finance-service` uses a Redis consumer group to read new messages from the stream and process them.
3. After successful processing, consumers acknowledge messages (XACK) so they are removed from the stream's PEL for that group.

Key benefits:
- Decoupling producers and consumers
- Scalable consumers (add more members to consumer groups)
- Persistence and replayability of events

---

## Redis Streams Best Practices & Tips 💡

- Use **consumer groups** (XGROUP/XREADGROUP) for scaling multiple consumers while ensuring each message is processed by one consumer in the group.
- Use **XACK** after successful processing to remove entries from the group's pending list.
- Implement **idempotency** in consumers (dedupe by event id or business key) to tolerate retries and duplicate deliveries.
- Monitor the **Pending Entries List (PEL)**; use XCLAIM to recover messages from failed consumers.
- Consider a **dead-letter stream** for repeatedly failing messages (move after N retries).
- Trim streams with `XTRIM` or `MAXLEN` to prevent unbounded growth. Keep retention aligned with replay needs.
- Persist Redis (AOF/RDB) and use proper persistence settings in production to avoid data loss.
- Use small, well-formed JSON payloads for events and avoid embedding large binary data.
- Add semantic event versioning to handle evolving event schemas (e.g., `type`, `version`, `data`).

---

## Example Redis usage (CLI)

Publish an event (producer):

```bash
XADD stream:collections * type "collection.created" data '{"id":"abc123","amount":100}'
```

Create a consumer group (once):

```bash
XGROUP CREATE stream:collections finance-group $ MKSTREAM
```

Consume with group (consumer reads and acknowledges):

```bash
# read new messages (block 5s) as consumer 'c1'
XREADGROUP GROUP finance-group c1 COUNT 10 BLOCK 5000 STREAMS stream:collections >

# after processing, acknowledge
XACK stream:collections finance-group <message-id>
```

---

## Implementation notes for this project 🔧

- `collection-service/services/eventService.js` should wrap Redis publishing (XADD) and follow a small schema (type, id, timestamp, data).
- `finance-service/services/consumerService.js` should use `XREADGROUP` with a consumer-group name and call `XACK` after successful processing.
- Add retry logic and a maximum retry threshold that moves messages to a dead-letter stream if processing keeps failing.
- Use `NODE_ENV` to distinguish development vs production behavior, especially stream trimming and persistence settings.

---

## Deployment & Operations 🚀

- Run Redis as a managed service for production (Azure Redis Cache, AWS ElastiCache) or a dedicated cluster.
- Use Docker and `docker-compose` for local dev. Example for local dev:
  - Start Redis: `docker run --name redis -p 6379:6379 -d redis:7`
  - Start services with an environment file pointing at Redis host.
- Add health checks and readiness probes for each service.
- Configure logging and export metrics (e.g., Prometheus) for rate of messages, PEL size, consumer lag, and processing errors.

---

## Developer tips & debugging 🐞

- To inspect the stream and PEL:
  - `XRANGE stream:collections - +` — list entries
  - `XPENDING stream:collections finance-group` — shows pending messages and idle times
- To claim stuck messages from a dead consumer:
  - `XCLAIM stream:collections finance-group new-consumer 0 <msg-id>`
- For local testing, keep a separate stream prefix like `dev:stream:collections` to avoid accidentally mixing environments.

---

## Environment variables

Example `.env` values used by services:

```
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_STREAM_NAME=stream:collections
REDIS_CONSUMER_GROUP=finance-group
NODE_ENV=development
```

---

## Troubleshooting checklist ⚠️

- Consumers not receiving messages: ensure consumer group exists and consumers use the same group name.
- Messages stuck in PEL: check consumer health, claim messages, and review stack traces for processing errors.
- High memory from streams: configure periodic trimming or set retention policy.
- Duplicate processing: implement idempotency and ensure XACK is only called after success.

---

## Further improvements ✅

- Add event schema validation (JSON Schema) on producer/consumer boundaries.
- Implement dead-letter queues and visibility timeouts.
- Add end-to-end integration tests that simulate producers and multiple consumers.

---

If you'd like, I can:
- Add a `docker-compose.yml` with both services + Redis for local development, or
- Add example publish/consume scripts and a small test harness.

---

**Happy coding!** If you want, tell me which option to add next (compose file, scripts, or tests) and I'll implement it. ✨
