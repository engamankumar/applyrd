FROM python:3.10-slim

WORKDIR /app

# Install system dependencies if required (e.g. for psycopg2)
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the standard Cloud Run port
EXPOSE 8080

# Command to run the uvicorn server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
