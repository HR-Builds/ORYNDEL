import json
import re

from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings

_groq = None
_gemini = None


def get_grok():
    """Return the Groq chat model used by existing agents."""
    global _groq

    if _groq is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is missing in .env")

        _groq = ChatGroq(
            model="openai/gpt-oss-120b",
            api_key=settings.GROQ_API_KEY,
            temperature=0,
        )

    return _groq


def get_gemini():
    """Keep Gemini available for onboarding and vision tasks."""
    global _gemini

    if _gemini is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is missing in .env")

        _gemini = ChatGoogleGenerativeAI(
            model="gemini-3.8-flash",
            api_key=settings.GEMINI_API_KEY,
        )

    return _gemini


def ask_grok(prompt: str) -> str:
    response = get_grok().invoke(prompt)
    content = response.content

    if not isinstance(content, str):
        raise ValueError("Groq returned a non-text response.")

    return content.strip()


def parse_json(text: str):
    """Extract JSON from model output, including Markdown code fences."""
    cleaned = re.sub(r"```(?:json)?", "", text, flags=re.IGNORECASE).strip()

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)

    if not match:
        raise ValueError(f"No JSON found in LLM output: {text[:200]}")

    return json.loads(match.group(0))

