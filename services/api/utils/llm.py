"""
Shared LangChain LLM factory for OpenRouter.

Usage:
    from ..utils.llm import get_llm
    llm = get_llm()
    response = llm.invoke([HumanMessage(content="...")])
    content = response.content

    # Async:
    response = await llm.ainvoke([HumanMessage(content="...")])

Configure in .env:
    LLM_MODEL=qwen/qwen3-4b:free
    LLM_FALLBACK_MODELS=meta-llama/llama-3.2-1b-instruct:free,google/gemma-3-4b-it:free
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
        # with_fallbacks: on RateLimitError or connection error, try next model automatically
        return primary.with_fallbacks(
            fallbacks,
            exceptions_to_handle=(RateLimitError, APIConnectionError),
        )

    return primary
