FROM python:3.9-slim

WORKDIR /app

# Install build dependencies and pip requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy application source
COPY src/ ./

# Default command — adjust if your app uses a different entrypoint
CMD ["python3", "main.py"]
