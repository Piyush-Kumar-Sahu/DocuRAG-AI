from typing import Optional
import httpx
from app.core.config import settings
from app.services.llm.base import BaseLLM

class OllamaLLM(BaseLLM):
    def __init__(
        self,
        host: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        base_url: Optional[str] = None,
    ):
        raw_host = host or base_url or settings.OLLAMA_HOST or getattr(settings, "OLLAMA_BASE_URL", "https://ollama.com")
        self.host = raw_host.rstrip("/")
        self.api_key = api_key if api_key is not None else settings.OLLAMA_API_KEY
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout if timeout is not None else getattr(settings, "OLLAMA_TIMEOUT", getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 600.0))

    @property
    def base_url(self) -> str:
        return self.host

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if self.host.endswith("/api"):
            url = f"{self.host}/generate"
        else:
            url = f"{self.host}/api/generate"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key and self.api_key.strip():
            headers["Authorization"] = f"Bearer {self.api_key.strip()}"

        try:
            http_timeout = httpx.Timeout(
                timeout=self.timeout,
                connect=30.0,
                read=self.timeout,
                write=60.0
            )
            with httpx.Client(timeout=http_timeout) as client:
                response = client.post(url, json=payload, headers=headers)
                if response.status_code == 401:
                    raise RuntimeError("Ollama authentication failed: Invalid or missing API key.")
                if response.status_code == 403:
                    raise RuntimeError("Ollama authorization failed: Access denied with provided credentials.")
                if response.status_code == 404:
                    raise RuntimeError(f"Ollama model '{self.model}' not found or unavailable on host.")
                if response.status_code == 429:
                    raise RuntimeError("Ollama rate limit reached. Please retry shortly.")
                
                response.raise_for_status()
                data = response.json()
                if not isinstance(data, dict):
                    raise RuntimeError("Invalid response format received from Ollama Cloud.")
                if "error" in data:
                    raise RuntimeError(f"Ollama error: {data['error']}")
                result = data.get("response")
                if result is None:
                    raise RuntimeError("Malformed response from Ollama: missing 'response' field.")
                return result.strip()
        except httpx.ConnectError:
            raise ConnectionError(
                f"Could not connect to Ollama at {self.host}. Please verify network connectivity and host endpoint."
            )
        except httpx.TimeoutException:
            raise TimeoutError(
                f"Ollama request timed out after {self.timeout} seconds."
            )
        except (ConnectionError, TimeoutError, RuntimeError) as e:
            raise e
        except Exception as e:
            raise RuntimeError(f"Ollama generation failed: {str(e)}")
