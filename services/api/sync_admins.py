#!/usr/bin/env python3
import os
import sys

def main():
    # Attempt to read from .env if variables aren't already exported
    if not os.getenv("SUPABASE_URL"):
        try:
            with open(os.path.join(os.path.dirname(__file__), "../../.env"), "r") as f:
                for line in f:
                    if line.startswith("SUPABASE_URL="):
                        os.environ["SUPABASE_URL"] = line.strip().split("=")[1]
                    elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                        os.environ["SUPABASE_SERVICE_ROLE_KEY"] = line.strip().split("=")[1]
                    elif line.startswith("ADMIN_EMAILS="):
                        os.environ["ADMIN_EMAILS"] = line.strip().split("=", 1)[1]
        except Exception as e:
            print(f"[sync_admins] Could not parse .env: {e}")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    admin_emails_str = os.getenv("ADMIN_EMAILS", "")

    if not supabase_url or not supabase_key:
        print("[sync_admins] Missing Supabase configuration.")
        sys.exit(1)

    try:
        from supabase import create_client
    except ImportError:
        print("[sync_admins] Supabase package not found. Make sure you run this in the correct venv.")
        sys.exit(1)

    client = create_client(supabase_url, supabase_key)
    
    # Parse emails from env
    emails = [e.strip() for e in admin_emails_str.split(",") if e.strip()]
    print(f"[sync_admins] Found {len(emails)} admin emails in config to sync.")

    if not emails:
        print("[sync_admins] No admin emails configured.")
        return

    # Upsert emails into the admins table
    for email in emails:
        try:
            client.table("admins").upsert({"email": email}, on_conflict="email").execute()
            print(f"  ✓ Synced admin: {email}")
        except Exception as e:
            print(f"  ! Failed to sync {email}: {e}")
            if "relation \"public.admins\" does not exist" in str(e):
                print("\n[CRITICAL ERROR] The 'admins' table does not exist in your database!")
                print("Please push the database migration by running: ")
                print("  supabase db push")
                print("Then restart start.sh\n")
                sys.exit(1)

    print("[sync_admins] Admin sync complete.")

if __name__ == "__main__":
    main()
