import uuid
import logging
from fastapi import APIRouter, HTTPException, status

from ..dependencies import CurrentUser, CurrentUserID
from ..models.schemas import OnboardRequest, ProfileUpdateRequest, SubscriptionCreateRequest
from ..utils.supabase_client import get_supabase_service_client, ms
from ..services.planner_service import generate_initial_plan

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/onboard", status_code=status.HTTP_201_CREATED)
async def onboard(body: OnboardRequest, user: CurrentUser):
    user_id: uuid.UUID = user["id"]
    client = get_supabase_service_client()

    existing = client.table("profiles").select("onboarding_completed").eq("id", str(user_id)).single().execute()
    if existing.data and existing.data.get("onboarding_completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "already_onboarded", "code": "ONBOARDING_COMPLETE"},
        )

    client.table("profiles").update({
        "full_name": body.full_name,
        "phone": body.phone,
        "exam_target": body.exam_target.value,
        "exam_date": body.exam_date.isoformat() if body.exam_date else None,
        "current_class": body.current_class,
        "daily_study_hours": body.daily_study_hours,
        "preferred_language": body.preferred_language.value,
        "onboarding_completed": True,
    }).eq("id", str(user_id)).execute()

    client.table("revision_streaks").upsert({
        "user_id": str(user_id),
        "current_streak": 0,
        "longest_streak": 0,
    }).execute()

    plan = await generate_initial_plan(
        user_id=user_id,
        exam_type=body.exam_target,
        exam_date=body.exam_date,
        daily_hours=body.daily_study_hours,
    )

    logger.info("User onboarded", extra={"user_id": str(user_id), "exam_target": body.exam_target})
    return {"profile": client.table("profiles").select("*").eq("id", str(user_id)).single().execute().data, "plan_id": plan["id"]}


@router.get("/profile")
async def get_profile(user_id: CurrentUserID):
    client = get_supabase_service_client()

    profile = client.table("profiles").select("*").eq("id", str(user_id)).single().execute()
    subscription = ms(client.table("subscriptions").select("*").eq("user_id", str(user_id)).eq("is_active", True))
    streak = ms(client.table("revision_streaks").select("*").eq("user_id", str(user_id)))

    return {
        "profile": profile.data,
        "subscription": subscription.data,
        "streak": streak.data,
    }


@router.patch("/profile")
async def update_profile(body: ProfileUpdateRequest, user_id: CurrentUserID):
    client = get_supabase_service_client()
    updates = body.model_dump(exclude_none=True)
    if "preferred_language" in updates:
        updates["preferred_language"] = updates["preferred_language"].value
    if "exam_date" in updates:
        updates["exam_date"] = updates["exam_date"].isoformat()

    result = client.table("profiles").update(updates).eq("id", str(user_id)).execute()
    return {"profile": result.data[0] if result.data else None}


@router.get("/subscription")
async def get_subscription(user_id: CurrentUserID):
    client = get_supabase_service_client()
    profile = client.table("profiles").select("subscription_tier").eq("id", str(user_id)).single().execute()
    sub = ms(client.table("subscriptions").select("*").eq("user_id", str(user_id)).eq("is_active", True))

    tier = profile.data["subscription_tier"]
    features = ["tutor", "retention"] if tier == "free" else ["tutor", "retention", "planner", "mcq", "content", "voice"]

    return {
        "tier": tier,
        "expires_at": sub.data["expires_at"] if sub.data else None,
        "features_unlocked": features,
    }


@router.post("/subscription/create")
async def create_subscription(body: SubscriptionCreateRequest, user_id: CurrentUserID):
    # Razorpay integration — returns order for frontend to complete payment
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"error": "not_implemented", "code": "RAZORPAY_PENDING"},
    )
