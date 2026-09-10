from abc import ABC, abstractmethod
from typing import Optional

class BaseLLM(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        pass
