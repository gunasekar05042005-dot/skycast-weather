// Netlify Serverless Function
// API key is stored in Netlify Environment Variables — never exposed to browser

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const API_KEY = process.env.OWM_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "OWM_API_KEY not set in Netlify Environment Variables." }),
    };
  }

  const { city, lat, lon, zip, country } = event.queryStringParameters || {};
  const BASE = "https://api.openweathermap.org/data/2.5/weather";
  let url;

  if (lat && lon) {
    url = `${BASE}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  } else if (city) {
    url = `${BASE}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
  } else if (zip) {
    url = `${BASE}?zip=${encodeURIComponent(zip)},${country || "IN"}&appid=${API_KEY}&units=metric`;
  } else {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Provide ?city=, ?lat=&lon=, or ?zip=" }),
    };
  }

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok) {
      if (upstream.status === 401)
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid API key." }) };
      if (upstream.status === 404)
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Location not found. Try adding country code e.g. Ranipet,IN" }) };
      return { statusCode: upstream.status, headers, body: JSON.stringify({ error: data.message }) };
    }

    const r = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        city:        data.name,
        country:     data.sys.country,
        lat:         r(data.coord.lat, 4),
        lon:         r(data.coord.lon, 4),
        temp:        r(data.main.temp),
        feels_like:  r(data.main.feels_like),
        temp_min:    r(data.main.temp_min),
        temp_max:    r(data.main.temp_max),
        humidity:    data.main.humidity,
        pressure:    data.main.pressure,
        condition:   data.weather[0].main,
        description: data.weather[0].description.charAt(0).toUpperCase() +
                     data.weather[0].description.slice(1),
        icon_code:   data.weather[0].icon,
        wind_speed:  data.wind.speed,
        visibility:  Math.floor((data.visibility || 0) / 1000),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error: " + err.message }),
    };
  }
};
