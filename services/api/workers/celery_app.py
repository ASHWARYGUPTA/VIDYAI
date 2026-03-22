from celery import Celery

# Lazy init — settings resolved at worker startup, not import time
celery_app = Celery(
    "vidyai",
    broker="amqp://vidyai:vidyai_dev@localhost:5672/vidyai",
    backend="redis://localhost:6379/0",
    include=["services.api.workers.video_worker", "services.api.workers.scheduler_worker", "services.api.workers.planner_worker"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "nightly-revision-scheduler": {
            "task": "services.api.workers.scheduler_worker.run_nightly_scheduler",
            "schedule": 86400,
        },
        "nightly-plan-rebalancer": {
            "task": "services.api.workers.planner_worker.run_nightly_rebalancer",
            "schedule": 86400,
        },
    },
)


def configure_from_settings():
    """Call at worker startup to apply real broker/backend URLs from env."""
    from ..config import get_settings
    s = get_settings()
    celery_app.conf.broker_url = s.rabbitmq_url
    celery_app.conf.result_backend = s.redis_url
