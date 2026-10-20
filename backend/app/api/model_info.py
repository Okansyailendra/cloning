import os
import json
from fastapi import APIRouter, Request, Response
from app.schemas import ModelInfoResponse
from app.config import settings

router = APIRouter()

@router.get("/model-info", response_model=ModelInfoResponse)
async def get_model_info(request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    
    meta_path = settings.get_path(settings.MODEL_META_PATH)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    class_means_path = settings.get_path(settings.CLASS_MEANS_PATH)
    with open(class_means_path, "r", encoding="utf-8") as f:
        class_means = json.load(f)
        
    samples_meta_path = settings.get_path(os.path.join(settings.SAMPLES_DIR, "samples.json"))
    samples = []
    if os.path.exists(samples_meta_path):
        with open(samples_meta_path, "r", encoding="utf-8") as f:
            samples = json.load(f)

    return ModelInfoResponse(
        model=meta.get("model", {}),
        pipeline=meta.get("pipeline", {}),
        features=meta.get("features", []),
        metrics=meta.get("metrics", {}),
        model_comparison=meta.get("model_comparison", []),
        dataset=meta.get("dataset", {}),
        class_means=class_means,
        limits=meta.get("limits", {
            "max_file_mb": settings.MAX_FILE_MB,
            "max_duration_s": settings.MAX_DURATION_S,
            "min_duration_s": settings.MIN_DURATION_S,
            "accepted_extensions": [".mp3", ".wav", ".ogg", ".flac", ".m4a"],
            "warn_threshold": settings.CONFIDENCE_WARN_THRESHOLD
        }),
        samples=samples
    )
