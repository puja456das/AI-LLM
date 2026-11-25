import os
from sqlalchemy import create_engine, text

# Load DATABASE_URL from .env (the .env file is in the backend folder)
from pathlib import Path
env_path = Path(__file__).resolve().parents[1] / '.env'
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.strip().startswith('DATABASE_URL'):
            key, val = line.split('=',1)
            os.environ[key.strip()] = val.strip().strip('"')

url = os.getenv('DATABASE_URL')
engine = create_engine(url)
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);"))
print('Column full_name ensured')
