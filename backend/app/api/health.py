import time
import sklearn
from fastapi import APIRouter, Request, Response
from app.schemas import HealthResponse

router = APIRouter()

START_TIME = time.time()

@router.get("/health", response_model=HealthResponse)
async def get_health(request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    uptime = int(time.time() - START_TIME)
    predictor = getattr(request.app.state, "predictor", None)
    model_loaded = predictor is not None and getattr(predictor, "model", None) is not None

    return HealthResponse(
        status="ok",
        model_loaded=model_loaded,
        sklearn_version=sklearn.__version__,
        uptime_s=uptime
    )
