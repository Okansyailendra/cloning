from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import uuid

class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, detail: dict = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.detail = detail or {}

async def app_error_handler(request: Request, exc: AppError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "detail": exc.detail
            },
            "request_id": req_id
        },
        headers={"X-Request-ID": req_id, "Cache-Control": "no-store"}
    )
