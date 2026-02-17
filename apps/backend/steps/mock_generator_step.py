"""
ForgeAI Mock Generator — Visual Validation Engine

Motia Queue Step (Python) that generates high-fidelity UI mocks
for feature cards using the Prodia v2 inference API.

Converts a feature description into a prompt optimized for SaaS UI
generation, calls Prodia's FLUX model, and places the resulting
image on the Tldraw canvas next to the originating feature card.

Trigger: queue event "feature.visualize"
Enqueues: "canvas.update" with an image shape
"""

import base64
import os
from typing import Any

import requests
from requests.adapters import HTTPAdapter, Retry
from langsmith import traceable

PRODIA_API_KEY = os.environ.get("PRODIA_API_KEY", "")
PRODIA_INFERENCE_URL = "https://inference.prodia.com/v2/job"

config = {
    "type": "event",
    "name": "MockGenerator",
    "description": "Generates UI mocks for feature cards via Prodia image generation",
    "subscribes": ["feature.visualize"],
    "emits": ["canvas.update"],
    "flows": ["mock-flow"],
}

PROMPT_TEMPLATE = (
    "Professional SaaS web interface screenshot, clean UI/UX design, "
    "modern dashboard application, {description}, "
    "high fidelity mockup, minimal and elegant, light theme, "
    "sharp text and icons, Figma design system"
)


def _prodia_session() -> requests.Session:
    """Create a requests session with retry logic and auth."""
    session = requests.Session()
    retries = Retry(
        total=2,
        allowed_methods=None,
        status_forcelist=Retry.RETRY_AFTER_STATUS_CODES,
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({"Authorization": f"Bearer {PRODIA_API_KEY}"})
    return session


@traceable(name="generate-ui-mock-prodia", run_type="tool")
def call_prodia(prompt: str, ctx: Any) -> str:
    """
    Calls Prodia v2 inference API to generate a UI mock.

    Uses FLUX schnell for fast, high-quality generation.
    Returns a base64 data URI of the generated JPEG image.
    """
    if not PRODIA_API_KEY:
        raise ValueError("PRODIA_API_KEY is not set")

    enhanced_prompt = PROMPT_TEMPLATE.format(description=prompt)
    session = _prodia_session()

    ctx.logger.info(f"Calling Prodia v2 with prompt: {enhanced_prompt[:80]}...")

    res = session.post(
        PRODIA_INFERENCE_URL,
        headers={"Accept": "image/jpeg;quality=85"},
        json={
            "type": "inference.flux-fast.schnell.txt2img.v2",
            "config": {
                "prompt": enhanced_prompt,
            },
        },
        timeout=30,
    )
    res.raise_for_status()

    image_bytes = res.content
    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_uri = f"data:image/jpeg;base64,{b64}"

    ctx.logger.info(f"Prodia mock generated ({len(image_bytes)} bytes)")
    return data_uri


@traceable(name="mock-generator", run_type="chain", tags=["mock", "prodia", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Main handler for the Mock Generator.

    1. Receives a feature description and canvas coordinates
    2. Calls Prodia to generate a UI mock image
    3. Enqueues canvas update to place the image beside the feature card
    """
    board_id = data.get("boardId", "")
    shape_id = data.get("shapeId", "")
    description = data.get("description", "A modern software feature")
    x = data.get("x", 0)
    y = data.get("y", 0)

    ctx.logger.info(f"Mock Generator processing for board: {board_id} shape: {shape_id} desc: {description[:60]}")

    try:
        image_url = call_prodia(description, ctx)

        # Place the image 320px to the right of the originating shape
        await ctx.emit({"topic": "canvas.update", "data": {
            "boardId": board_id,
            "action": "explosion",
            "shapes": [
                {
                    "type": "image",
                    "x": x + 320,
                    "y": y,
                    "props": {
                        "w": 600,
                        "h": 450,
                        "url": image_url,
                        "name": f"Mock: {description[:40]}",
                    },
                }
            ],
        }})

        ctx.logger.info(f"Mock placed on canvas for board {board_id}")

    except ValueError as e:
        ctx.logger.error(f"Prodia config error: {e}")
    except Exception as e:
        ctx.logger.error(f"Mock generation failed: {e}")
        # Place a placeholder comment on the canvas
        await ctx.emit({"topic": "canvas.update", "data": {
            "boardId": board_id,
            "action": "explosion",
            "shapes": [
                {
                    "type": "comment",
                    "x": x + 320,
                    "y": y,
                    "props": {
                        "w": 240,
                        "h": 100,
                        "text": f"Mock generation failed: {str(e)[:100]}",
                        "author": "Mock Engine",
                        "authorColor": "#DC2626",
                        "targetShapeId": shape_id,
                    },
                }
            ],
        }})
