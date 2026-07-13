FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create directory for persistent SQLite database
RUN mkdir -p /app/data

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Set environment variables
ENV PORT=8000
ENV DATABASE_URL=sqlite:////app/data/productive_floof.db

# Expose the API port
EXPOSE 8000

# Run using the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
