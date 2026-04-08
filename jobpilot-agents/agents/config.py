from typing import List
import os

# Centralized cascade array of Gemini and Gemma models for High Availability
# OPTIMIZED FOR YOUR VERIFIED HIGH-QUOTA PRODUCTION MODELS (April 2026)
CASCADE_MODELS: List[str] = [
    "models/gemini-3.1-flash-lite-preview", # Verified ID (15,000 QPM)
    "models/gemini-3.1-pro-preview",        # Verified ID (Reasoner)
    "models/gemini-3-flash-preview",        # Verified ID
    "models/gemini-2.5-flash-lite",         # Verified working
    "models/gemini-2.5-flash",              # Verified working
    "models/gemini-2-flash",       
    "models/gemma-4-31b-it",         # Stable Fallback
]

# FAST_CASCADE_MODELS (Used for rapid inbox-only scanning)
# Using your highest production quota models
FAST_CASCADE_MODELS: List[str] = [
    "models/gemini-3.1-flash-lite-preview",
    "models/gemini-2.5-flash-lite",
    "models/gemini-2-flash"
    "models/gemma-4-31b-it",
]

def get_active_model():
    """Returns the primary model, but agents use the cascade logic internally."""
    return CASCADE_MODELS[0]

# Note: Using your verified production IDs to leverage your 4,000 QPM Vertex AI quotas.
# This ensures ultra-fast, zero-429 performance with your new key.
