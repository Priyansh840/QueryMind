"""
QueryMind - LLM Service
Handles communication with LLM providers (Gemini API + Ollama fallback).
"""

import google.generativeai as genai
import httpx
from typing import Optional

from app.config.settings import settings


class LLMService:
    """
    Unified LLM service supporting:
    - Google Gemini API (primary, cloud-based)
    - Ollama (fallback, local)
    """

    def __init__(self):
        self.provider = "gemini"  # Default provider

        # Configure Gemini
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.gemini_model = None

        # Ollama config
        self.ollama_base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = getattr(settings, "OLLAMA_MODEL", "llama3.2")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> str:
        """
        Generate a response from the LLM.

        Args:
            prompt: User query/prompt
            system_prompt: System instructions for the LLM
            provider: Force a specific provider ("gemini" or "ollama")

        Returns:
            Generated text response
        """
        use_provider = provider or self.provider

        try:
            if use_provider == "gemini":
                return await self._generate_gemini(prompt, system_prompt)
            elif use_provider == "ollama":
                return await self._generate_ollama(prompt, system_prompt)
            else:
                raise ValueError(f"Unknown LLM provider: {use_provider}")
        except Exception as e:
            # If primary fails, try fallback
            if use_provider == "gemini":
                print(f"Gemini failed: {e}. Falling back to Ollama...")
                try:
                    return await self._generate_ollama(prompt, system_prompt)
                except Exception as ollama_error:
                    raise RuntimeError(
                        f"Both LLM providers failed. Gemini: {e}, Ollama: {ollama_error}"
                    )
            raise

    async def _generate_gemini(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Generate response using Google Gemini API."""
        if not self.gemini_model:
            raise RuntimeError("Gemini API key not configured")

        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        response = await self.gemini_model.generate_content_async(full_prompt)
        return response.text

    async def _generate_ollama(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Generate response using local Ollama instance."""
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
        }

        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.ollama_base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    async def health_check(self) -> dict:
        """Check which LLM providers are available."""
        status = {"gemini": False, "ollama": False}

        # Check Gemini
        if self.gemini_model:
            try:
                await self._generate_gemini("Say 'OK'")
                status["gemini"] = True
            except Exception:
                pass

        # Check Ollama
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.ollama_base_url}/api/tags")
                status["ollama"] = resp.status_code == 200
        except Exception:
            pass

        return status


# Singleton instance
llm_service = LLMService()
