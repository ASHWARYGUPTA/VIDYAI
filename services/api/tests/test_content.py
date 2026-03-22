import pytest
from unittest.mock import patch, MagicMock
from .conftest import TEST_USER_ID, TEST_VIDEO_ID, make_sb_mock


@pytest.mark.asyncio
async def test_process_video_success(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"subscription_tier": "free"}),           # tier
        MagicMock(data=None, count=0),                           # rate limit
        MagicMock(data=[{"id": str(TEST_VIDEO_ID)}]),            # insert video row
        MagicMock(data=[{"id": str(TEST_VIDEO_ID)}]),            # update job_id
    ]

    mock_task = MagicMock()
    mock_task.id = "celery-task-abc123"

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.content.celery_app") as mock_celery:
        mock_celery.send_task.return_value = mock_task
        r = await client.post("/api/v1/content/process", json={
            "youtube_url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
            "output_language": "en",
        })

    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "pending"
    assert "job_id" in body


@pytest.mark.asyncio
async def test_process_video_rate_limit(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"subscription_tier": "free"}),
        MagicMock(data=None, count=5),  # at limit
    ]

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.content.celery_app"):
        r = await client.post("/api/v1/content/process", json={
            "youtube_url": "https://youtube.com/watch?v=abc",
        })

    assert r.status_code == 429
    assert r.json()["detail"]["code"] == "VIDEO_LIMIT_REACHED"


@pytest.mark.asyncio
async def test_process_video_url_too_short(client):
    r = await client.post("/api/v1/content/process", json={"youtube_url": "yt.be"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_status_pending(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data={
        "id": str(TEST_VIDEO_ID),
        "processing_status": "pending",
        "job_id": "celery-task-abc123",
        "error_message": None,
    })

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/content/status/celery-task-abc123")

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending"
    assert body["progress_percent"] == 0
    assert body["result"] is None


@pytest.mark.asyncio
async def test_get_status_completed(client):
    sb, chain, exe = make_sb_mock()
    video_data = {
        "id": str(TEST_VIDEO_ID),
        "processing_status": "completed",
        "job_id": "celery-task-done",
        "title": "Physics Lecture",
        "error_message": None,
    }
    chain.execute.return_value = MagicMock(data=video_data)

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/content/status/celery-task-done")

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "completed"
    assert body["progress_percent"] == 100
    assert body["result"] is not None


@pytest.mark.asyncio
async def test_get_status_not_found(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/content/status/nonexistent-job")

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_videos(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(
        data=[{"id": str(TEST_VIDEO_ID), "title": "Physics", "processing_status": "completed"}],
        count=1
    )

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/content/videos")

    assert r.status_code == 200
    assert r.json()["total"] == 1


@pytest.mark.asyncio
async def test_get_video(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data={"id": str(TEST_VIDEO_ID), "title": "Chemistry Notes"})

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/content/video/{TEST_VIDEO_ID}")

    assert r.status_code == 200
    assert "video" in r.json()


@pytest.mark.asyncio
async def test_get_video_not_found(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/content/video/{TEST_VIDEO_ID}")

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_video(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{}])

    with patch("services.api.routers.content.get_supabase_service_client", return_value=sb):
        r = await client.delete(f"/api/v1/content/video/{TEST_VIDEO_ID}")

    assert r.status_code == 200
    assert r.json()["deleted"] is True
