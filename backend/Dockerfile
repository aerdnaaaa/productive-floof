FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create directory for persistent SQLite database
RUN mkdir -p /app/data

# Set environment variables
ENV PORT=8000
ENV DATABASE_URL=sqlite:////app/data/productive_floof.db

# Expose the API port
EXPOSE 8000

# Run the backend using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
