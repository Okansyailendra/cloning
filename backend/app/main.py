import os
import json
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

from app.config import settings
from app.errors import AppError, app_error_handler
from app.services.predictor import AudioPredictor
from app.api import predict, model_info, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load model and metadata once
    model_full_path = settings.get_path(settings.MODEL_PATH)
    app.state.predictor = AudioPredictor(model_full_path)
    
    class_means_full_path = settings.get_path(settings.CLASS_MEANS_PATH)
    if os.path.exists(class_means_full_path):
        with open(class_means_full_path, "r", encoding="utf-8") as f:
            app.state.class_means = json.load(f)
    else:
        app.state.class_means = {}
        
    
    # Warmup feature extraction & model for zero-latency live inference
    try:
        import numpy as np
        import librosa
        dummy_y = (np.random.randn(22050 * 3) * 0.01).astype(np.float32)
        d_rms = librosa.feature.rms(y=dummy_y)
        d_cent = librosa.feature.spectral_centroid(y=dummy_y, sr=22050)
        d_zcr = librosa.feature.zero_crossing_rate(y=dummy_y)
        d_mfcc = librosa.feature.mfcc(y=dummy_y, sr=22050, n_mfcc=13)
        dummy_feat = {
            'rms_mean': 0.05, 'mfcc1_mean': -250.0, 'rms_std': 0.03, 'mfcc3_mean': -20.0,
            'zcr_mean': 0.08, 'mfcc6_mean': -5.0, 'mfcc7_mean': -10.0, 'mfcc13_mean': -5.0,
            'mfcc5_mean': -10.0, 'centroid_mean': 1700.0
        }
        if app.state.predictor and app.state.predictor.model:
            app.state.predictor.predict(dummy_feat)
    except Exception as e:
        pass

    yield

app = FastAPI(
    title="Sound Lab API",
    description="Klasifikasi Audio Kebisingan Lingkungan Kerja",
    version="1.0.0",
    lifespan=lifespan
)

# Request ID & Logging Middleware
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = req_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response

# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handlers
app.add_exception_handler(AppError, app_error_handler)

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "KESALAHAN_SERVER",
                "message": "Terjadi kesalahan pada server. Coba lagi; jika berulang, hubungi pengelola.",
                "detail": {}
            },
            "request_id": req_id
        },
        headers={"X-Request-ID": req_id, "Cache-Control": "no-store"}
    )

# Static files for samples
samples_dir = settings.get_path(settings.SAMPLES_DIR)
if os.path.exists(samples_dir):
    app.mount("/samples", StaticFiles(directory=samples_dir), name="samples")
# Static files for audio alarm
audio_alarm_dir = os.path.join(settings.BASE_DIR, "audio_alarm")
if os.path.exists(audio_alarm_dir):
    app.mount("/audio_alarm", StaticFiles(directory=audio_alarm_dir), name="audio_alarm")


# Routers
app.include_router(predict.router, prefix="/api", tags=["Predict"])
app.include_router(model_info.router, prefix="/api", tags=["Model Info"])
app.include_router(health.router, prefix="/api", tags=["Health"])

# Production frontend SPA static serving
frontend_dist = os.path.join(settings.BASE_DIR, "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
