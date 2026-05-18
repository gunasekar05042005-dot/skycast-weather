import os
import json
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler

API_KEY  = os.environ.get("OWM_API_KEY", "")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

def fetch_weather(params: dict):
    params["appid"] = API_KEY
    params["units"] = "metric"
    url = BASE_URL + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=10) as res:
        return json.loads(res.read())

def build_response(data: dict) -> dict:
    w = data["weather"][0]
    m = data["main"]
    return {
        "city":        data.get("name", "Unknown"),
        "country":     data["sys"].get("country", ""),
        "lat":         round(data["coord"]["lat"], 4),
        "lon":         round(data["coord"]["lon"], 4),
        "temp":        round(m["temp"], 1),
        "feels_like":  round(m["feels_like"], 1),
        "temp_min":    round(m["temp_min"], 1),
        "temp_max":    round(m["temp_max"], 1),
        "humidity":    m["humidity"],
        "pressure":    m["pressure"],
        "condition":   w["main"],
        "description": w["description"].capitalize(),
        "icon_code":   w["icon"],
        "wind_speed":  data["wind"]["speed"],
        "visibility":  data.get("visibility", 0) // 1000,
    }

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        parsed = urllib.parse.urlparse(self.path)
        qs     = urllib.parse.parse_qs(parsed.query)

        if not API_KEY:
            self._error("OWM_API_KEY environment variable not set."); return

        try:
            if "lat" in qs and "lon" in qs:
                params = {"lat": qs["lat"][0], "lon": qs["lon"][0]}
            elif "city" in qs:
                params = {"q": qs["city"][0]}
            elif "zip" in qs:
                country = qs.get("country", ["IN"])[0]
                params  = {"zip": f"{qs['zip'][0]},{country}"}
            else:
                self._error("Provide ?city=, ?lat=&lon=, or ?zip= query param"); return

            raw    = fetch_weather(params)
            result = build_response(raw)
            self.wfile.write(json.dumps(result).encode())

        except urllib.error.HTTPError as e:
            body = json.loads(e.read())
            code = e.code
            if code == 401:
                self._error("Invalid API key.")
            elif code == 404:
                self._error("Location not found. Try a different name or use coordinates.")
            else:
                self._error(body.get("message", "Unknown error from weather API."))
        except Exception as ex:
            self._error(str(ex))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def _error(self, msg: str):
        self.wfile.write(json.dumps({"error": msg}).encode())

    def log_message(self, *args):
        pass
