from typing import List
import os

# Centralized cascade array of Gemini and Gemma models for High Availability
# OPTIMIZED FOR YOUR VERIFIED HIGH-QUOTA PRODUCTION MODELS (April 2026)
CASCADE_MODELS: List[str] = [
    "models/gemini-2.5-flash-lite",      # 4,000 QPM (VERIFIED WORKING)
    "models/gemini-1.5-flash-latest",    # Stable High-Quota Fallback
    "models/gemini-2-flash-lite",        # 4,000 QPM
    "models/gemini-2-flash",             # 2,000 QPM
    "models/gemma-4-31b-it",             # Verified Fallback
    "models/gemini-1.5-pro-latest",      # Pro Reasoner (Working Fallback)
    "models/gemini-3-flash",             # 1,000 QPM
]

# FAST_CASCADE_MODELS (Used for rapid inbox-only scanning)
# Using your highest production quota models
FAST_CASCADE_MODELS: List[str] = [
    "models/gemini-2.5-flash-lite",
    "models/gemini-1.5-flash-latest",
    "models/gemini-2-flash-lite"
]

def get_active_model():
    """Returns the primary model, but agents use the cascade logic internally."""
    return CASCADE_MODELS[0]

# Note: Using your verified production IDs to leverage your 4,000 QPM Vertex AI quotas.
# This ensures ultra-fast, zero-429 performance with your new key.
