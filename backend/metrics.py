"""
Prometheus Metrics for DenseMatrix Demo Tools
"""
from prometheus_client import Counter, Histogram
import os

TOOL_SLUG = os.getenv("TOOL_SLUG", "bad-review-translator")

# Payment metrics
PAYMENT_COUNTER = Counter(
    'creem_payment_total',
    'Total payment attempts',
    ['tool', 'status']
)

WEBHOOK_COUNTER = Counter(
    'creem_webhook_total',
    'Total webhook events received',
    ['tool', 'event']
)

# Generation metrics
GENERATION_COUNTER = Counter(
    'generation_total',
    'Total generation requests',
    ['tool', 'type']
)

TOKEN_CONSUMED = Counter(
    'generation_token_consumed',
    'Total tokens consumed',
    ['tool']
)

GENERATION_LATENCY = Histogram(
    'generation_latency_seconds',
    'Generation request latency',
    ['tool'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
)


def record_payment(status: str):
    PAYMENT_COUNTER.labels(tool=TOOL_SLUG, status=status).inc()


def record_webhook(event: str):
    WEBHOOK_COUNTER.labels(tool=TOOL_SLUG, event=event).inc()


def record_generation(gen_type: str = "free"):
    GENERATION_COUNTER.labels(tool=TOOL_SLUG, type=gen_type).inc()


def record_token_consumed(count: int = 1):
    TOKEN_CONSUMED.labels(tool=TOOL_SLUG).inc(count)


def generation_timer():
    return GENERATION_LATENCY.labels(tool=TOOL_SLUG).time()
