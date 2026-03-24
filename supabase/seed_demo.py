#!/usr/bin/env python3
"""
VidyAI — Remote demo user bootstrap via Supabase Admin API.

This script is called by push_remote.sh after migrations + SQL seeds have run.
It ensures the demo user exists with the correct password and marks onboarding
as complete — even if the SQL seed's direct auth.users INSERT was skipped on
production (where direct table access to auth schema may be restricted).

Usage (standalone):
    pip install supabase
    python3 supabase/seed_demo.py \
        --url https://nrfogjkzsisfnxijopxh.supabase.co \
        --service-key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

import argparse
import sys
import os
from datetime import date, timedelta

DEMO_UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
DEMO_EMAIL = "demo@vidyai.in"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Arjun Sharma"


def get_client(url: str, service_key: str):
    try:
        from supabase import create_client
    except ImportError:
        print("[ERROR] supabase package not found. Run: pip install supabase")
        sys.exit(1)
    return create_client(url, service_key)


def ensure_demo_user(client) -> str:
    """Create or update demo@vidyai.in via the admin API. Returns the user UUID."""
    print(f"  Checking if {DEMO_EMAIL} exists...")

    # Try to get existing user by email
    try:
        users_resp = client.auth.admin.list_users()
        existing = next(
            (u for u in users_resp if u.email == DEMO_EMAIL),
            None,
        )
    except Exception as e:
        print(f"  [WARN] Could not list users: {e}")
        existing = None

    if existing:
        uid = existing.id
        print(f"  User already exists: {uid}")
        # Update password to ensure it's correct
        client.auth.admin.update_user_by_id(
            uid,
            {"password": DEMO_PASSWORD, "email_confirm": True},
        )
        print(f"  Password reset to '{DEMO_PASSWORD}'")
        return uid
    else:
        print(f"  Creating user {DEMO_EMAIL}...")
        resp = client.auth.admin.create_user(
            {
                "email": DEMO_EMAIL,
                "password": DEMO_PASSWORD,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": DEMO_NAME,
                    "exam_target": "JEE",
                },
                # Request the specific UUID the SQL seed uses so both stay in sync
                # (Supabase allows custom UUID on admin create)
            }
        )
        uid = resp.user.id
        print(f"  Created user: {uid}")
        return uid


def ensure_profile(client, uid: str):
    """Upsert the profile row so onboarding is marked complete."""
    exam_date = (date.today() + timedelta(days=90)).isoformat()
    print(f"  Upserting profile for uid={uid}...")

    client.table("profiles").upsert(
        {
            "id": uid,
            "email": DEMO_EMAIL,
            "full_name": DEMO_NAME,
            "exam_target": "JEE",
            "exam_date": exam_date,
            "current_class": "12",
            "daily_study_hours": 5,
            "onboarding_completed": True,
            "subscription_tier": "pro",
            "last_active_date": date.today().isoformat(),
        },
        on_conflict="id",
    ).execute()
    print("  Profile upserted ✓")


def ensure_revision_streak(client, uid: str):
    """Upsert revision streak so the dashboard streak widget shows data."""
    print("  Upserting revision streak...")
    client.table("revision_streaks").upsert(
        {
            "user_id": uid,
            "current_streak": 7,
            "longest_streak": 14,
            "last_revision_date": date.today().isoformat(),
            "total_revision_days": 32,
            "freeze_tokens_remaining": 2,
        },
        on_conflict="user_id",
    ).execute()
    print("  Revision streak upserted ✓")


def main():
    parser = argparse.ArgumentParser(description="Seed demo user for VidyAI remote Supabase")
    parser.add_argument("--url", required=True, help="Supabase project URL")
    parser.add_argument("--service-key", required=True, help="Supabase service role key")
    args = parser.parse_args()

    print(f"\n[seed_demo.py] Connecting to {args.url}")
    client = get_client(args.url, args.service_key)

    uid = ensure_demo_user(client)
    ensure_profile(client, uid)
    ensure_revision_streak(client, uid)

    print(f"\n  Demo user ready:")
    print(f"    Email    : {DEMO_EMAIL}")
    print(f"    Password : {DEMO_PASSWORD}")
    print(f"    UUID     : {uid}")
    print()


if __name__ == "__main__":
    main()
