import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import logging
from backend.data_hub.database import init_db, engine
from backend.data_hub.models import Base

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def main():
    logger.info("Initializing telematics data hub database tables...")
    init_db()
    logger.info("Database schema initialized successfully on engine: %s", engine.url)


if __name__ == "__main__":
    main()
