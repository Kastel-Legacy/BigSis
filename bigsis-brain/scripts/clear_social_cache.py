from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

def clear_cache():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found")
        return
        
    # Sync engine for simpler script
    sync_url = db_url.replace('postgresql+asyncpg', 'postgresql')
    engine = create_engine(sync_url)
    
    with engine.connect() as conn:
        conn.execute(text('DELETE FROM social_generations'))
        conn.commit()
    print("✅ Social generations cache cleared.")

if __name__ == "__main__":
    clear_cache()
