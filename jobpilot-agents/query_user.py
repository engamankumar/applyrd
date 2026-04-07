import os, psycopg2
from dotenv import load_dotenv
load_dotenv()
db_url = os.getenv("DATABASE_URL")
if "?" in db_url: db_url = db_url.split("?")[0]
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT email FROM \"User\" LIMIT 1;")
    user = cur.fetchone()
    if user: print(user[0])
    else: print("None")
    cur.close()
    conn.close()
except:
    # Try public IP if local connection fails
    print("DB connect failed")
