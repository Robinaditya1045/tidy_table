#!/bin/bash

echo "Starting Ollama service..."
docker-compose up -d ollama

echo "Waiting for Ollama to be ready..."
sleep 10

echo "Pulling recommended models..."
docker exec ai-data-manager-ollama ollama pull llama3.1:8b
docker exec ai-data-manager-ollama ollama pull codellama:13b
docker exec ai-data-manager-ollama ollama pull mistral:7b

echo "Models ready! Ollama is running on http://localhost:11434"
