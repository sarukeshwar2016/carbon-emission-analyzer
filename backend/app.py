from flask import Flask, jsonify
from flask_cors import CORS
import redis, requests, json, os

app = Flask(__name__)
CORS(app)  # enable CORS for frontend requests

# Redis connection
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
r = redis.Redis(host=REDIS_HOST, port=6379, decode_responses=True)

# Climatiq API key
CLIMATIQ_API_KEY = os.getenv("CLIMATIQ_API_KEY", "8H1Z9GEE6X7EKCZQC72KV2SFHC")

@app.route('/emission/electricity/<region>/<float:energy>', methods=['GET'])
def get_emission(region, energy):
    cache_key = f"emission_{region}_{energy}"
    cached = r.get(cache_key)
    if cached:
        return jsonify({"source": "cache", "data": json.loads(cached)})

    url = "https://api.climatiq.io/estimate"
    headers = {"Authorization": f"Bearer {CLIMATIQ_API_KEY}"}
    payload = {
        "emission_factor": {
            "activity_id": "electricity-energy_source_grid_mix",
            "region": region
        },
        "parameters": {
            "energy": energy,
            "energy_unit": "kWh"
        }
    }

    response = requests.post(url, headers=headers, json=payload)
    data = response.json()

    r.setex(cache_key, 3600, json.dumps(data))  # cache for 1 hour
    return jsonify({"source": "api", "data": data})

@app.route('/')
def home():
    return jsonify({"message": "Climatiq Carbon Emission API with Redis Cache"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
