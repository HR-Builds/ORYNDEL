import json
import re
from langchain_xai import ChatXAI
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings

_grok = None
_gemini = None


def get_grok():
    global _grok
    if _grok is None:
        if not settings.XAI_API_KEY:
            raise RuntimeError("XAI_API_KEY is missing in .env")
        _grok = ChatXAI(model="grok-3", api_key=settings.XAI_API_KEY)
    return _grok


def get_gemini():
    global _gemini
    if _gemini is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is missing in .env")
        _gemini = ChatGoogleGenerativeAI(model="gemini-3.8-flash", api_key=settings.GEMINI_API_KEY)
    return _gemini


def ask_grok(prompt: str) -> str:
    return get_grok().invoke(prompt).content.strip()


def parse_json(text: str):
    """Extracts the first JSON object from LLM output, tolerating markdown fences."""
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in LLM output: {text[:200]}")
    return json.loads(match.group(0))
