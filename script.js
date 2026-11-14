document.addEventListener("DOMContentLoaded", () => {

  const map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([4.2105, 101.9758], 5);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  let marker = null;
  let selected = null;

  const locationName = document.getElementById("locationName");
  const coords = document.getElementById("coords");
  const analyzeBtn = document.getElementById("analyzeBtn");

  function resizeMap() {
    setTimeout(() => {
      map.invalidateSize(true);
    }, 300);
  }

  window.addEventListener("load", resizeMap);
  window.addEventListener("resize", resizeMap);

  document.querySelectorAll('a[href="#fieldshift"]').forEach(link => {
    link.addEventListener("click", () => {
      setTimeout(resizeMap, 500);
    });
  });

  async function reverseGeocode(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error("Geocoding failed");
      }

      const data = await response.json();
      const address = data.address || {};

      const city =
        address.city ||
        address.town ||
        address.municipality ||
        address.village ||
        address.county;

      const country = address.country;

      if (city && country) {
        return `${city}, ${country}`;
      }

      return data.display_name || "Selected field";

    } catch (error) {
      return "Selected field";
    }
  }

  function makeAssessment(lat, lon) {

    const seed =
      Math.abs(
        Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453
      ) % 1;

    const rainfall = Math.round(35 + seed * 55);
    const soil = Math.round(
      30 + ((seed * 1.73) % 1) * 60
    );

    const temp = Math.round(
      25 + ((seed * 2.41) % 1) * 10
    );

    const veg = Math.round(
      35 + ((seed * 3.17) % 1) * 60
    );

    const heatRisk =
      temp >= 32
        ? "High"
        : temp >= 29
        ? "Moderate"
        : "Low";

    const waterStress =
      soil < 45
        ? "High"
        : soil < 65
        ? "Moderate"
        : "Low";

    const vegetation =
      veg < 50
        ? "Declining"
        : veg < 70
        ? "Stable"
        : "Healthy";

    const health = Math.max(
      35,
      Math.min(
        96,
        Math.round(
          0.30 * soil +
          0.25 * veg +
          0.25 * rainfall +
          0.20 * (100 - (temp - 25) * 8)
        )
      )
    );

    return {
      rainfall,
      soil,
      temp,
      veg,
      heatRisk,
      waterStress,
      vegetation,
      health
    };
  }

  async function selectLocation(lat, lon) {

    selected = { lat, lon };

    if (marker) {
      marker.remove();
    }

    marker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup("Selected field")
      .openPopup();

    coords.textContent =
      `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;

    locationName.textContent = "Finding location…";

    const name = await reverseGeocode(lat, lon);

    locationName.textContent = name;

    analyzeBtn.disabled = false;

    resizeMap();
  }

  map.on("click", event => {
    selectLocation(
      event.latlng.lat,
      event.latlng.lng
    );
  });

  analyzeBtn.addEventListener("click", () => {

    if (!selected) return;

    const a = makeAssessment(
      selected.lat,
      selected.lon
    );

    document.getElementById("healthScore").textContent =
      a.health;

    document.getElementById("ringScore").textContent =
      a.health;

    document.getElementById("rainfall").textContent =
      a.rainfall < 60
        ? "Below baseline"
        : "Near baseline";

    document.getElementById("rainfallValue").textContent =
      `${a.rainfall} mm · 30-day estimate`;

    document.getElementById("soil").textContent =
      a.soil < 45
        ? "Low"
        : a.soil < 65
        ? "Moderate"
        : "Good";

    document.getElementById("soilValue").textContent =
      `${a.soil}% · relative condition`;

    document.getElementById("temp").textContent =
      `${a.temp}°C · ${a.heatRisk}`;

    document.getElementById("tempValue").textContent =
      `Surface temperature estimate`;

    document.getElementById("vegetation").textContent =
      a.vegetation;

    document.getElementById("vegValue").textContent =
      `${a.veg}/100 · vegetation index`;

    document.getElementById("whyText").textContent =
      `The selected area shows ${a.waterStress.toLowerCase()} water stress, ` +
      `${a.heatRisk.toLowerCase()} heat risk and ` +
      `${a.vegetation.toLowerCase()} vegetation condition. ` +
      `FieldShift surfaces these signals so farmers can monitor changing conditions and adapt earlier.`;
  });

  setTimeout(resizeMap, 500);
});
