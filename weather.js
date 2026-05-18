// api/weather.js — Vercel Serverless Function
// API key is stored in Vercel Environment Variables (never exposed to browser)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const API_KEY = process.env.OWM_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: "OWM_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  const { city, lat, lon, zip, country } = req.query;
  const BASE = "https://api.openweathermap.org/data/2.5/weather";
  let url;

  if (lat && lon) {
    url = `${BASE}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  } else if (city) {
    url = `${BASE}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
  } else if (zip) {
    const cc = country || "IN";
    url = `${BASE}?zip=${encodeURIComponent(zip)},${cc}&appid=${API_KEY}&units=metric`;
  } else {
    return res.status(400).json({
      error: "Provide ?city=, ?lat=&lon=, or ?zip= as query parameters.",
    });
  }

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok) {
      if (upstream.status === 401)
        return res.status(401).json({ error: "Invalid API key." });
      if (upstream.status === 404)
        return res.status(404).json({
          error: "Location not found. Try adding a country code (e.g. Ranipet,IN) or use coordinates.",
        });
      return res.status(upstream.status).json({
        error: data.message || "Error from OpenWeatherMap.",
      });
    }

    const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

    return res.status(200).json({
      city:        data.name,
      country:     data.sys.country,
      lat:         round(data.coord.lat, 4),
      lon:         round(data.coord.lon, 4),
      temp:        round(data.main.temp),
      feels_like:  round(data.main.feels_like),
      temp_min:    round(data.main.temp_min),
      temp_max:    round(data.main.temp_max),
      humidity:    data.main.humidity,
      pressure:    data.main.pressure,
      condition:   data.weather[0].main,
      description: data.weather[0].description.charAt(0).toUpperCase() +
                   data.weather[0].description.slice(1),
      icon_code:   data.weather[0].icon,
      wind_speed:  data.wind.speed,
      visibility:  Math.floor((data.visibility || 0) / 1000),
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
