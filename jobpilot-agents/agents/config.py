import os
from typing import List

# Centralized cascade array of Gemini models for High Availability
CASCADE_MODELS: List[str] = [
    "models/gemini-3.1-flash-lite-preview",
    "models/gemini-3-flash-preview",
    "models/gemini-2.5-flash-lite",
    "models/gemini-2.0-flash-lite-001",
    "models/gemini-2.0-flash",
    "models/gemini-1.5-flash",
    "models/gemini-pro-latest"
]

FAST_CASCADE_MODELS: List[str] = [
    "models/gemini-2.0-flash",
    "models/gemini-2.5-flash-lite",
    "models/gemini-1.5-flash"
]

_ACTIVE_MODEL_CACHE = None

def get_active_model() -> str:
    """Pings models rapidly on first startup, caches and returns the fastest working model."""
    global _ACTIVE_MODEL_CACHE
    if _ACTIVE_MODEL_CACHE:
        return _ACTIVE_MODEL_CACHE
        
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return CASCADE_MODELS[0]
        
    try:
        from google import genai
        client = genai.Client(api_key=key)
        for m in CASCADE_MODELS:
            try:
                # Send minimum payload for rapid ping latency
                client.models.generate_content(model=m, contents="OK")
                _ACTIVE_MODEL_CACHE = m
                print(f"🚀 [Config] Successfully locked system model to: {m}")
                return m
            except Exception:
                pass
    except Exception:
        pass
        
    _ACTIVE_MODEL_CACHE = CASCADE_MODELS[0]
    return _ACTIVE_MODEL_CACHE

def get_vertex_model() -> str:
    """Returns the working model string stripped of 'models/' for Vertex SDK."""
    return get_active_model().replace("models/", "")

# Map dynamic defaults safely
DEFAULT_MODEL: str = "gemini-1.5-flash"
REASONING_MODEL: str = "gemini-1.5-pro"
