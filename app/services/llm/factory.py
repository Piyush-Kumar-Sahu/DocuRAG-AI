from typing import Optional
from app.core.config import settings
from app.services.llm.base import BaseLLM
from app.services.llm.ollama import OllamaLLM

def get_llm_service(provider: Optional[str] = None) -> BaseLLM:
    selected_provider = (provider or settings.LLM_PROVIDER).lower()
    if selected_provider == "ollama":
        return OllamaLLM()
    else:
        raise ValueError(
            f"Unsupported LLM_PROVIDER '{selected_provider}'. The only supported option is 'ollama'."
        )
