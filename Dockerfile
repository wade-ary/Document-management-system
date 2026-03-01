FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV POETRY_NO_INTERACTION=1
ENV POETRY_VENV_IN_PROJECT=1
ENV POETRY_CACHE_DIR=/opt/poetry-cache
ENV PORT=5000

# Set work directory
WORKDIR /app

# Install system dependencies (minimal for OpenCV)
RUN apt-get update && apt-get install -y \
    curl \
    libgl1-mesa-dev \
    libglib2.0-0 \
    libgomp1 \
    python3-opencv \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==1.7.1

# Copy poetry files
COPY pyproject.toml poetry.lock ./

# Configure poetry and install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev \
    && rm -rf /opt/poetry-cache

# Copy project files
COPY . .

# Download required SpaCy models and other dependencies
RUN python setup.py

# Set matplotlib config directory to writable location
ENV MPLCONFIGDIR=/tmp/matplotlib

# Create non-root user
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --gid 1001 appuser

# Change ownership of the app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Run the application
CMD gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 --worker-class sync app:app