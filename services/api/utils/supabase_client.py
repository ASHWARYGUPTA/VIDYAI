from supabase import create_client, Client
from functools import lru_cache
from ..config import get_settings


class _EmptyResponse:
    """Returned by ms() when maybe_single finds no row."""
    data = None


def ms(query) -> "_EmptyResponse | Client":
    """Safe maybe_single: always returns an object with .data (None if no row)."""
    r = query.maybe_single().execute()
    return r if r is not None else _EmptyResponse()

@lru_cache(maxsize=1)
def get_supabase_service_client() -> Client:
    """Service-role client for backend operations — bypasses RLS."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_anon_client() -> Client:
    """Anon client for user-scoped operations — respects RLS."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)
