"""
Shared LangChain LLM factory for OpenRouter and Google Gemini.

Usage:
    from ..utils.llm import get_llm, get_gemini_llm
    llm = get_llm()
    response = llm.invoke([HumanMessage(content="...")])
    content = response.content

Configure in .env:
    LLM_MODEL=qwen/qwen3-4b:free
    LLM_FALLBACK_MODELS=meta-llama/llama-3.2-1b-instruct:free,google/gemma-3-4b-it:free
    GEMINI_API_KEY=your_key  # enables fast single-call processing
"""

import logging
from langchain_openai import ChatOpenAI
from openai import RateLimitError, APIConnectionError

logger = logging.getLogger(__name__)
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def _build_llm(model: str, api_key: str, temperature: float, max_tokens: int) -> ChatOpenAI:
    if model.startswith("openrouter/"):
        model = model[len("openrouter/"):]
    return ChatOpenAI(
        model=model,
        openai_api_key=api_key,
        openai_api_base=OPENROUTER_BASE_URL,
        temperature=temperature,
        max_tokens=max_tokens,
    )


def get_llm(
    model: str = None,
    temperature: float = 0.2,
    max_tokens: int = 1024,
) -> ChatOpenAI:
    from ..config import get_settings
    settings = get_settings()

    primary_model = model or settings.llm_model
    fallback_models = [
        m.strip()
        for m in settings.llm_fallback_models.split(",")
        if m.strip() and m.strip() != primary_model
    ]

    api_key = settings.openrouter_api_key
    primary = _build_llm(primary_model, api_key, temperature, max_tokens)

    if fallback_models:
        fallbacks = [_build_llm(m, api_key, temperature, max_tokens) for m in fallback_models]
        return primary.with_fallbacks(
            fallbacks,
            exceptions_to_handle=(RateLimitError, APIConnectionError),
        )

    return primary


def get_gemini_llm(model: str = "gemini-1.5-flash", temperature: float = 0.2, max_tokens: int = 2048):
    """Return a Gemini LLM via Google's API (fast, 1M context, free tier).

    Falls back to None if GEMINI_API_KEY is not configured so callers
    can gracefully fall back to the OpenRouter path.
    """
    from ..config import get_settings
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.gemini_api_key,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
    except Exception as e:
        logger.warning("Failed to initialise Gemini LLM: %s", e)
        return None
