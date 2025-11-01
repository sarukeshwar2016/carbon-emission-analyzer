# Use a lightweight Python image
FROM python:3.10-slim

# Set working directory inside the container
WORKDIR /app

# Copy project files into the container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir flask redis requests

# Expose the Flask port
EXPOSE 5000

# Environment variable for Climatiq API Key (passed from docker-compose)
ENV CLIMATIQ_API_KEY=""

# Run the Flask application
CMD ["python", "app.py"]
