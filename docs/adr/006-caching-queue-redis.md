# ADR-006: Use Redis as Caching Layer and Message Broker

**Status**: Accepted
**Date**: 2026-03-19

## Context

The system has two distinct async needs that both require an in-memory data store:

1. **Message broker for Celery**: Evaluation scoring jobs are computationally expensive and must run asynchronously. Celery requires a message broker to queue and dispatch tasks to workers.
2. **Caching**: Leaderboard rankings and scoring results are read-heavy and computed from expensive aggregation queries. Caching reduces repeated computation.

A single infrastructure component serving both roles is preferred to minimize operational complexity for a solo developer.

### Message Broker Candidates (for Celery)

| Broker | Celery Support | Docker | Persistence | Complexity |
|--------|:--------------:|:------:|:-----------:|:----------:|
| **Redis** | First-class | Official | RDB + AOF | Low |
| RabbitMQ | First-class | Official | Durable queues | Medium |
| Amazon SQS | Plugin | N/A | Managed | High (cloud) |

**RabbitMQ rejected**: Better durability semantics, but significantly more complex to operate. For a research system where occasional task loss on restart is acceptable, Redis provides sufficient reliability with far lower operational overhead.

### Caching Candidates

| Tool | Shared State | Persistence | TTL | Async Python |
|------|:-----------:|:-----------:|:---:|:------------:|
| **Redis** | Yes | Yes | Native | `redis-py` async |
| Memcached | Yes | No | Native | `aiomcache` |
| In-process (lru_cache) | No | No | Manual | Yes |

**Memcached rejected**: No persistence, no data structure support beyond key-value. Cannot double as a Celery broker.

**In-process cache rejected**: Not shared across multiple workers. State lost on restart. Unsuitable for leaderboard data that must be consistent across requests.

## Decision

Use **Redis 7** as both the **Celery message broker** and **application cache**.

| Concern | Configuration |
|---------|--------------|
| Celery broker URL | `redis://redis:6379/0` |
| Celery result backend | `redis://redis:6379/1` (separate DB) |
| Application cache | `redis://redis:6379/2` (separate DB) |
| Eviction policy | `allkeys-lru` for cache DB |
| Persistence | RDB snapshots (default) |

### Cache TTL Strategy

| Data | TTL | Rationale |
|------|----:|-----------|
| Leaderboard rankings | 60 seconds | Near real-time, cheap to recompute |
| Submission scores | 5 minutes | Stable after scoring completes |
| Task config | 10 minutes | Changes only on admin update |
| User session | 24 hours | Standard session lifetime |

## Eviction Policy Isolation

`allkeys-lru` is a Redis **instance-level** setting, not per-DB. If `maxmemory` is set on the shared Redis instance, LRU eviction applies to all DBs including broker (DB 0) and result backend (DB 1) — this can silently drop unprocessed task messages.

**Decision**: Do **not** set `maxmemory` on the shared Redis instance. Instead, enforce cache bounds through explicit TTL on every cache key (see TTL Strategy table above). This makes eviction predictable and per-key rather than LRU-global.

```conf
# redis.conf — do NOT set maxmemory for the shared instance
# maxmemory 256mb        ← commented out intentionally
# maxmemory-policy allkeys-lru  ← not applied
```

If memory pressure becomes a concern in production, isolate the application cache into a **separate Redis instance** (`redis://redis-cache:6379/0`) with its own `maxmemory` config, leaving the broker instance unrestricted.

## Consequences

### Easier
- Single Redis instance serves both Celery and application cache — one service to operate, monitor, and back up.
- Redis native TTL eliminates manual cache invalidation for time-bounded data (leaderboard, session).
- Celery + Redis is the most documented, widely tested combination in the Celery ecosystem.
- `redis-py` async client integrates cleanly with FastAPI's async request handling.
- Separate Redis DB numbers (0, 1, 2) provide logical isolation without separate instances.
- Redis Docker image (`redis:7-alpine`) is lightweight and starts in under 1 second locally.

### Harder
- Adds Redis as an infrastructure dependency in all environments (local, CI, production).
- Cache invalidation on task config changes must be explicitly implemented (flush cache DB 2 on admin update).
- Redis single-instance has no built-in high availability — acceptable for MVP; requires Redis Sentinel or Cluster for production scale.
- Must implement graceful degradation when Redis is unavailable (fall back to direct DB queries without caching).
