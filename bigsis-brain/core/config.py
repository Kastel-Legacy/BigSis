import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    PUBMED_EMAIL = os.getenv("PUBMED_EMAIL", "contact@bigsis.app")
    MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    
    # Garde-fous budgétaires
    MAX_STUDIES_PER_RUN = 25
    SEARCH_DAYS_BACK = 3650
    
settings = Settings()
