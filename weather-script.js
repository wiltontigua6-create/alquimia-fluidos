// ============================================
// WEATHER DASHBOARD - MAIN SCRIPT
// ============================================

// API Configuration
const API_CONFIG = {
    openWeatherMapKey: 'YOUR_API_KEY_HERE', // Get free API key from: https://openweathermap.org/api
};

// Constants
const AQI_LABELS = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
const AQI_COLORS = ['#00ff88', '#ffaa00', '#ff6b00', '#ff3860', '#8b0000'];

// Application State
const appState = {
    currentCity: null,
    currentWeather: null,
    forecast: null,
    airQuality: null,
    recentSearches: JSON.parse(localStorage.getItem('recentSearches')) || [],
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    geoBtn: document.getElementById('geoBtn'),
    suggestionsDropdown: document.getElementById('suggestionsDropdown'),
    currentWeatherCard: document.getElementById('currentWeatherCard'),
    forecastSection: document.getElementById('forecastSection'),
    forecastContainer: document.getElementById('forecastContainer'),
    hourlySection: document.getElementById('hourlySection'),
    hourlyContainer: document.getElementById('hourlyContainer'),
    airQualitySection: document.getElementById('airQualitySection'),
    errorMessage: document.getElementById('errorMessage'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    recentSearchesList: document.getElementById('recentSearchesList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadRecentSearches();
    fetchWeatherByCity('London');
});

function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.geoBtn.addEventListener('click', handleGeolocation);
    elements.clearHistoryBtn.addEventListener('click', clearRecentSearches);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-section')) {
            elements.suggestionsDropdown.classList.remove('active');
        }
    });
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

function handleSearch() {
    const city = elements.searchInput.value.trim();
    if (city) {
        fetchWeatherByCity(city);
        elements.suggestionsDropdown.classList.remove('active');
    }
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (query.length > 2) {
        showSearchSuggestions(query);
    }
}

function showSearchSuggestions(query) {
    const cities = ['London', 'New York', 'Tokyo', 'Paris', 'Sydney', 'Dubai', 'Singapore', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Barcelona', 'Istanbul', 'Moscow', 'Bangkok', 'Toronto', 'Mexico City', 'São Paulo', 'Cairo', 'Mumbai'];
    const suggestions = cities.filter(city => city.toLowerCase().startsWith(query.toLowerCase()));
    
    if (suggestions.length > 0) {
        elements.suggestionsDropdown.innerHTML = suggestions.map(city => `<div class="suggestion-item" onclick="fetchWeatherByCity('${city}')">📍 ${city}</div>`).join('');
        elements.suggestionsDropdown.classList.add('active');
    }
}

// ============================================
// GEOLOCATION
// ============================================

function handleGeolocation() {
    if (!navigator.geolocation) {
        showError('Geolocation not supported');
        return;
    }
    
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => {
            fetchWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
        },
        () => {
            showError('Unable to get location');
            hideLoading();
        }
    );
}

// ============================================
// API CALLS
// ============================================

async function fetchWeatherByCity(city) {
    showLoading();
    hideError();
    
    try {
        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_CONFIG.openWeatherMapKey}`);
        if (!geoResponse.ok) throw new Error('City not found');
        
        const geoData = await geoResponse.json();
        if (geoData.length === 0) throw new Error('City not found');
        
        const { lat, lon, name, country } = geoData[0];
        appState.currentCity = `${name}, ${country}`;
        
        await Promise.all([
            fetchCurrentWeather(lat, lon),
            fetchForecast(lat, lon),
            fetchAirQuality(lat, lon)
        ]);
        
        addRecentSearch(city);
        elements.searchInput.value = '';
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function fetchWeatherByCoordinates(lat, lon) {
    showLoading();
    hideError();
    
    try {
        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_CONFIG.openWeatherMapKey}`);
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.length > 0) {
                const { name, country } = geoData[0];
                appState.currentCity = `${name}, ${country}`;
            }
        }
        
        await Promise.all([
            fetchCurrentWeather(lat, lon),
            fetchForecast(lat, lon),
            fetchAirQuality(lat, lon)
        ]);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function fetchCurrentWeather(lat, lon) {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_CONFIG.openWeatherMapKey}`);
    if (!response.ok) throw new Error('Failed to fetch weather');
    const data = await response.json();
    displayCurrentWeather(data);
}

async function fetchForecast(lat, lon) {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_CONFIG.openWeatherMapKey}`);
    if (!response.ok) throw new Error('Failed to fetch forecast');
    const data = await response.json();
    displayForecast(data);
    displayHourlyForecast(data);
}

async function fetchAirQuality(lat, lon) {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_CONFIG.openWeatherMapKey}`);
    if (!response.ok) throw new Error('Failed to fetch air quality');
    const data = await response.json();
    displayAirQuality(data);
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayCurrentWeather(weather) {
    const { main, weather: weatherArray, sys, wind, visibility } = weather;
    const weatherInfo = weatherArray[0];
    
    document.getElementById('cityName').textContent = appState.currentCity;
    document.getElementById('dateTime').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('weatherIconLarge').src = `https://openweathermap.org/img/wn/${weatherInfo.icon}@4x.png`;
    document.getElementById('temperature').textContent = `${Math.round(main.temp)}°C`;
    document.getElementById('weatherDesc').textContent = weatherInfo.description;
    document.getElementById('feelsLike').textContent = `${Math.round(main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${main.humidity}%`;
    document.getElementById('pressure').textContent = `${main.pressure} mb`;
    document.getElementById('windSpeed').textContent = `${(wind.speed * 3.6).toFixed(1)} km/h`;
    document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} km`;
    document.getElementById('sunrise').textContent = new Date(sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sunset').textContent = new Date(sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const windDirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    document.getElementById('windDir').textContent = windDirs[Math.round(wind.deg / 22.5) % 16];
    
    elements.currentWeatherCard.classList.remove('hidden');
}

function displayForecast(forecastData) {
    const dailyForecasts = {};
    forecastData.list.forEach(item => {
        const day = new Date(item.dt * 1000).toDateString();
        if (!dailyForecasts[day]) dailyForecasts[day] = [];
        dailyForecasts[day].push(item);
    });
    
    const days = Object.keys(dailyForecasts).slice(0, 5);
    elements.forecastContainer.innerHTML = days.map(day => {
        const forecasts = dailyForecasts[day];
        const noonForecast = forecasts.find(f => new Date(f.dt * 1000).getHours() >= 11 && new Date(f.dt * 1000).getHours() <= 13) || forecasts[Math.floor(forecasts.length / 2)];
        const temp = noonForecast.main;
        const weather = noonForecast.weather[0];
        const date = new Date(noonForecast.dt * 1000);
        
        return `
            <div class="forecast-card">
                <div class="forecast-day">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div class="forecast-icon"><img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.description}"></div>
                <div class="forecast-temp">${Math.round(temp.temp)}°C</div>
                <div class="forecast-desc">${weather.description}</div>
                <div class="forecast-extra"><span>💧 ${temp.humidity}%</span></div>
            </div>
        `;
    }).join('');
    
    elements.forecastSection.classList.remove('hidden');
}

function displayHourlyForecast(forecastData) {
    elements.hourlyContainer.innerHTML = forecastData.list.slice(0, 24).map(item => {
        const weather = item.weather[0];
        return `
            <div class="hourly-card">
                <div class="hourly-time">${new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                <div class="hourly-icon"><img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png"></div>
                <div class="hourly-temp">${Math.round(item.main.temp)}°C</div>
            </div>
        `;
    }).join('');
    
    elements.hourlySection.classList.remove('hidden');
}

function displayAirQuality(airQuality) {
    const { main, components } = airQuality.list[0];
    const aqi = main.aqi;
    
    document.getElementById('aqiValue').textContent = aqi;
    document.getElementById('aqiLabel').textContent = AQI_LABELS[aqi - 1];
    document.getElementById('aqiLabel').style.color = AQI_COLORS[aqi - 1];
    document.getElementById('pm25').textContent = `${(components.pm2_5 || 0).toFixed(1)} µg/m³`;
    document.getElementById('pm10').textContent = `${(components.pm10 || 0).toFixed(1)} µg/m³`;
    document.getElementById('no2').textContent = `${(components.no2 || 0).toFixed(1)} µg/m³`;
    document.getElementById('o3').textContent = `${(components.o3 || 0).toFixed(1)} µg/m³`;
    
    elements.airQualitySection.classList.remove('hidden');
}

// ============================================
// UI STATE FUNCTIONS
// ============================================

function showLoading() { elements.loadingSpinner.classList.remove('hidden'); }
function hideLoading() { elements.loadingSpinner.classList.add('hidden'); }
function showError(msg) { elements.errorMessage.textContent = '❌ Error: ' + msg; elements.errorMessage.classList.remove('hidden'); }
function hideError() { elements.errorMessage.classList.add('hidden'); }

// ============================================
// RECENT SEARCHES
// ============================================

function addRecentSearch(city) {
    if (!appState.recentSearches.includes(city)) {
        appState.recentSearches.unshift(city);
        if (appState.recentSearches.length > 10) appState.recentSearches.pop();
        localStorage.setItem('recentSearches', JSON.stringify(appState.recentSearches));
        loadRecentSearches();
    }
}

function loadRecentSearches() {
    elements.recentSearchesList.innerHTML = appState.recentSearches.map(city => `<div class="recent-search-item" onclick="fetchWeatherByCity('${city}')">📍 ${city}</div>`).join('');
}

function clearRecentSearches() {
    appState.recentSearches = [];
    localStorage.removeItem('recentSearches');
    loadRecentSearches();
}

console.log('🌤️ Weather Dashboard loaded. Get your API key at https://openweathermap.org/api');
