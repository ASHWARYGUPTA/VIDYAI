"""
Shared LangChain LLM factory for OpenRouter.

Usage:
    from ..utils.llm import get_llm
    llm = get_llm()
    response = llm.invoke([HumanMessage(content="...")])
    content = response.content

    # Async:
    response = await llm.ainvoke([HumanMessage(content="...")])

Model is configured via LLM_MODEL in .env (default: google/gemma-3-4b-it:free).
"""

from langchain_openai import ChatOpenAI

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_llm(
    model: str = None,
    temperature: float = 0.2,
    max_tokens: int = 1024,
    retries: int = 3,
) -> ChatOpenAI:
    from ..config import get_settings
    settings = get_settings()
    # Use env-configured model if none specified
    if model is None:
        model = settings.llm_model
    # Strip openrouter/ prefix if present (legacy litellm-style model strings)
    if model.startswith("openrouter/"):
        model = model[len("openrouter/"):]
    llm = ChatOpenAI(
        model=model,
        openai_api_key=settings.openrouter_api_key,
        openai_api_base=OPENROUTER_BASE_URL,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if retries > 1:
        from openai import RateLimitError, APIConnectionError
        llm = llm.with_retry(
            retry_if_exception_type=(RateLimitError, APIConnectionError),
            stop_after_attempt=retries,
            wait_exponential_jitter=True,
        )
    return llm
