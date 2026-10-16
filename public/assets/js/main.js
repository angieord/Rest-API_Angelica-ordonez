/* DAILYWEATHER - MAIN JAVASCRIPT */

// API configuration
const API_KEY = "6401e847127240c38c813529260910";
const BASE_URL = "https://api.weatherapi.com/v1/forecast.json";

// Application state
let currentCity = "Toronto";
let forecastDays = 5;
let temperatureUnit = "c";
let weatherData = null;
let activeRequest = 0;

// DOM elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");

const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

const celsiusBtn = document.getElementById("celsius-btn");
const fahrenheitBtn = document.getElementById("fahrenheit-btn");
const forecastSelect = document.getElementById("forecast-days");

const hourlyContainer = document.getElementById("hourly-container");
const dailyContainer = document.getElementById("daily-container");

const statusMessage = document.getElementById("status-message");
const errorMessage = document.getElementById("error-message");

// HELPER FUNCTIONS

// Convert WeatherAPI icon URLs to HTTPS
function getIconUrl(icon) {
  if (!icon) return "";

  return icon.startsWith("//")
    ? `https:${icon}`
    : icon;
}

// Format a date without timezone shifting
function formatDate(dateString, options) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("en-US", options);
}

// Get temperature in the selected unit
function getTemperature(celsius, fahrenheit) {
  const value = temperatureUnit === "c"
    ? celsius
    : fahrenheit;

  return Math.round(value);
}

// Get selected unit symbol
function getUnitSymbol() {
  return temperatureUnit === "c" ? "°C" : "°F";
}

// Create an HTML element
function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// Update temperature unit labels
function updateUnitLabels() {
  const symbol = getUnitSymbol();

  document.getElementById("temperature-unit").textContent = symbol;

  document.querySelectorAll(".temp-unit").forEach(element => {
    element.textContent = symbol;
  });
}

// FETCH WEATHER DATA

async function getWeather(city = currentCity) {
  const requestId = ++activeRequest;

  statusMessage.textContent = "Updating weather...";
  errorMessage.textContent = "";

  try {
    const url = new URL(BASE_URL);

    // API parameters
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("q", city);
    url.searchParams.set("days", forecastDays);
    url.searchParams.set("aqi", "no");
    url.searchParams.set("alerts", "no");

    const response = await fetch(url);
    const data = await response.json();

    // Ignore outdated requests
    if (requestId !== activeRequest) {
      return;
    }

    if (!response.ok || data.error) {
      throw new Error(
        data.error?.message || "Unable to load weather information."
      );
    }

    // Save successful response
    weatherData = data;
    currentCity = city;

    // Update page
    displayWeather();

    statusMessage.textContent = "";

  } catch (error) {
    if (requestId !== activeRequest) {
      return;
    }

    console.error("WeatherAPI error:", error);

    errorMessage.textContent =
      `Unable to load weather: ${error.message}`;

    statusMessage.textContent = "";
  }
}

// DISPLAY WEATHER

function displayWeather() {
  if (!weatherData) return;

  updateUnitLabels();

  displayCurrentWeather(weatherData);
  displayHourlyForecast(weatherData);
  displayDailyForecast(weatherData);
}

// CURRENT WEATHER

function displayCurrentWeather(data) {
  const location = data.location;
  const current = data.current;
  const today = data.forecast.forecastday[0].day;

  // Location
  document.getElementById("city-name").textContent =
    `${location.name}, ${location.region || location.country}`;

  // Local date and time
  const [localDate, localTime] = location.localtime.split(" ");

  document.getElementById("current-date").textContent =
    `${formatDate(localDate, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    })} · ${localTime}`;

  // Current temperature
  document.getElementById("temperature").textContent =
    getTemperature(current.temp_c, current.temp_f);

  document.getElementById("condition").textContent =
    current.condition.text;

  document.getElementById("feels-like").textContent =
    getTemperature(current.feelslike_c, current.feelslike_f);

  // High and low
  document.getElementById("max-temp").textContent =
    getTemperature(today.maxtemp_c, today.maxtemp_f);

  document.getElementById("min-temp").textContent =
    getTemperature(today.mintemp_c, today.mintemp_f);

  // Weather icon
  const weatherIcon = document.getElementById("weather-icon");

  weatherIcon.src = getIconUrl(current.condition.icon);
  weatherIcon.alt = current.condition.text;

  // Weather metrics
  document.getElementById("humidity").textContent =
    `${current.humidity}%`;

  document.getElementById("wind").textContent =
    `${Math.round(current.wind_kph)} km/h`;

  document.getElementById("wind-direction").textContent =
    current.wind_dir;

  document.getElementById("visibility").textContent =
    `${current.vis_km} km`;

  document.getElementById("uv-index").textContent =
    current.uv;
}

// HOURLY FORECAST

function displayHourlyForecast(data) {
  hourlyContainer.replaceChildren();

  // Current local time from WeatherAPI
  const [localDate, localTime] = data.location.localtime.split(" ");
  const currentHour = Number(localTime.split(":")[0]);

  // Combine all available hourly forecasts
  const allHours = data.forecast.forecastday.flatMap(day => day.hour);

  // Display up to 12 upcoming hours
  const upcomingHours = allHours
    .filter(hour => {
      const [date, time] = hour.time.split(" ");
      const hourNumber = Number(time.split(":")[0]);

      return date > localDate ||
        (date === localDate && hourNumber >= currentHour);
    })
    .slice(0, 12);

  upcomingHours.forEach(hour => {
    const hourNumber = Number(
      hour.time.split(" ")[1].split(":")[0]
    );

    const formattedTime =
      `${hourNumber % 12 || 12} ${hourNumber >= 12 ? "PM" : "AM"}`;

    const card = createElement("article", "hour-card");

    const time = createElement("p", "", formattedTime);

    const icon = document.createElement("img");
    icon.src = getIconUrl(hour.condition.icon);
    icon.alt = hour.condition.text;
    icon.loading = "lazy";

    const temperature = createElement(
      "h3",
      "",
      `${getTemperature(hour.temp_c, hour.temp_f)}°`
    );

    card.append(time, icon, temperature);
    hourlyContainer.appendChild(card);
  });

  if (upcomingHours.length === 0) {
    hourlyContainer.textContent =
      "No upcoming hourly forecast available.";
  }
}

// DAILY FORECAST

function displayDailyForecast(data) {
  dailyContainer.replaceChildren();

  const days = data.forecast.forecastday;

  // Update heading
  document.getElementById("forecast-title").textContent =
    `${days.length}-Day Forecast`;

  days.forEach(day => {
    const card = createElement("article", "day-card");

    const weekday = createElement(
      "h3",
      "",
      formatDate(day.date, { weekday: "short" })
    );

    const date = createElement(
      "p",
      "",
      formatDate(day.date, {
        month: "short",
        day: "numeric"
      })
    );

    const icon = document.createElement("img");
    icon.src = getIconUrl(day.day.condition.icon);
    icon.alt = day.day.condition.text;
    icon.loading = "lazy";

    const maxTemp = createElement(
      "div",
      "max-temp",
      `${getTemperature(day.day.maxtemp_c, day.day.maxtemp_f)}°`
    );

    const minTemp = createElement(
      "div",
      "min-temp",
      `${getTemperature(day.day.mintemp_c, day.day.mintemp_f)}°`
    );

    card.append(weekday, date, icon, maxTemp, minTemp);
    dailyContainer.appendChild(card);
  });
}

// INTERACTIVE FEATURES

// Search for a city
searchForm.addEventListener("submit", event => {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (city) {
    getWeather(city);
    cityInput.value = "";
  }
});

// Change temperature unit
function setTemperatureUnit(unit) {
  temperatureUnit = unit;

  const isCelsius = unit === "c";

  celsiusBtn.classList.toggle("active", isCelsius);
  fahrenheitBtn.classList.toggle("active", !isCelsius);

  celsiusBtn.setAttribute("aria-pressed", String(isCelsius));
  fahrenheitBtn.setAttribute("aria-pressed", String(!isCelsius));

  // Re-render existing API data
  displayWeather();
}

celsiusBtn.addEventListener("click", () => {
  setTemperatureUnit("c");
});

fahrenheitBtn.addEventListener("click", () => {
  setTemperatureUnit("f");
});

// Change forecast days
forecastSelect.addEventListener("change", event => {
  forecastDays = Number(event.target.value);

  // Request updated API data
  getWeather(currentCity);
});

// Mobile navigation
menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

// Navigation links
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");

    document.querySelectorAll(".nav-link").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});


// INITIALIZE APPLICATION

// Render Lucide icons
if (window.lucide) {
  window.lucide.createIcons();
}

// Load Toronto weather on startup
getWeather("Toronto");
