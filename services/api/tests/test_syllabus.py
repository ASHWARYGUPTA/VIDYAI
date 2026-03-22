import pytest
from unittest.mock import patch, MagicMock
from .conftest import TEST_SUBJECT_ID, TEST_CHAPTER_ID, TEST_CONCEPT_ID, make_sb_mock


@pytest.mark.asyncio
async def test_get_subjects(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"id": str(TEST_SUBJECT_ID), "name": "Physics", "exam_types": ["JEE", "NEET"]},
        {"id": str(TEST_SUBJECT_ID), "name": "Chemistry", "exam_types": ["JEE", "NEET"]},
    ])

    with patch("services.api.routers.syllabus.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/syllabus/subjects?exam_type=JEE")

    assert r.status_code == 200
    assert len(r.json()["subjects"]) == 2


@pytest.mark.asyncio
async def test_get_chapters(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"id": str(TEST_CHAPTER_ID), "name": "Electrostatics", "chapter_number": 1},
    ])

    with patch("services.api.routers.syllabus.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/syllabus/chapters?subject_id={TEST_SUBJECT_ID}")

    assert r.status_code == 200
    assert len(r.json()["chapters"]) == 1


@pytest.mark.asyncio
async def test_get_concepts(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"id": str(TEST_CONCEPT_ID), "name": "Coulomb's Law", "difficulty_level": "Medium"},
    ])

    with patch("services.api.routers.syllabus.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/syllabus/concepts?chapter_id={TEST_CHAPTER_ID}")

    assert r.status_code == 200
    assert r.json()["concepts"][0]["name"] == "Coulomb's Law"


@pytest.mark.asyncio
async def test_get_concept(client):
    sb, chain, exe = make_sb_mock()
    concept_data = {
        "id": str(TEST_CONCEPT_ID),
        "name": "Coulomb's Law",
        "prerequisite_concept_ids": [],
        "related_concept_ids": [],
    }
    chain.execute.side_effect = [
        MagicMock(data=concept_data),
    ]

    with patch("services.api.routers.syllabus.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/syllabus/concept/{TEST_CONCEPT_ID}")

    assert r.status_code == 200
    body = r.json()
    assert body["concept"]["name"] == "Coulomb's Law"
    assert body["prerequisites"] == []
    assert body["related"] == []
