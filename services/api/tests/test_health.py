import pytest


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_no_auth_required(unauthed_client):
    r = await unauthed_client.get("/health")
    assert r.status_code == 200
