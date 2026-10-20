import os
import tempfile

def load_simple_env(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_simple_env(env_path)

class Settings:
    PORT: int = int(os.getenv('PORT', '8080'))
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    MODEL_PATH: str = os.getenv('MODEL_PATH', 'data/model_klasifikasi_audio.pkl')
    CLASS_MEANS_PATH: str = os.getenv('CLASS_MEANS_PATH', 'data/class_means.json')
    MODEL_META_PATH: str = os.getenv('MODEL_META_PATH', 'data/model_meta.json')
    SAMPLES_DIR: str = os.getenv('SAMPLES_DIR', 'samples')
    TMP_DIR: str = os.getenv('TMP_DIR', os.path.join(tempfile.gettempdir(), 'soundlab'))
    MAX_FILE_MB: int = int(os.getenv('MAX_FILE_MB', '15'))
    MAX_DURATION_S: float = float(os.getenv('MAX_DURATION_S', '120.0'))
    MIN_DURATION_S: float = float(os.getenv('MIN_DURATION_S', '0.5'))
    CONFIDENCE_WARN_THRESHOLD: float = float(os.getenv('CONFIDENCE_WARN_THRESHOLD', '0.65'))
    MAX_WORKERS: int = int(os.getenv('MAX_WORKERS', '2'))
    QUEUE_WAIT_S: int = int(os.getenv('QUEUE_WAIT_S', '15'))
    PROCESS_TIMEOUT_S: int = int(os.getenv('PROCESS_TIMEOUT_S', '30'))
    RATE_LIMIT_PREDICT: str = os.getenv('RATE_LIMIT_PREDICT', '10/minute')
    RATE_LIMIT_DEFAULT: str = os.getenv('RATE_LIMIT_DEFAULT', '60/minute')
    ALLOWED_ORIGINS: str = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000')
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')

    def get_path(self, rel_path: str) -> str:
        if os.path.isabs(rel_path):
            return rel_path
        return os.path.join(self.BASE_DIR, rel_path)

settings = Settings()
