import axios from 'axios';

const API_KEY = import.meta.env.VITE_WEATHERSTACK_API_KEY;
const BASE_URL = 'http://api.weatherstack.com'; // Note: HTTPS often fails on free tier

// Static fallback list for demo if API fails
const FALLBACK_CITIES = [
    "New York", "London", "Paris", "Tokyo", "Singapore", "Sydney", "Dubai", "Mumbai", "Delhi", "Bangalore",
    "Shanghai", "Los Angeles", "Chicago", "Toronto", "Vancouver", "Berlin", "Madrid", "Rome", "Moscow",
    "Beijing", "Seoul", "Bangkok", "Istanbul", "Cairo", "Rio de Janeiro", "Buenos Aires"
];

export const getWeather = async (city) => {
    try {
        const response = await axios.get(`${BASE_URL}/current`, {
            params: {
                query: city,
                access_key: API_KEY,
                units: 'm', // 'm' for Metric
            },
        });

        if (response.data.success === false) {
            throw new Error(response.data.error.info);
        }

        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getForecast = async (city) => {
    try {
        // WeatherStack free tier usually doesn't support forecast.
        // We'll try to fetch it, but consumer should handle if it returns error or limited data.
        const response = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                query: city,
                access_key: API_KEY,
                units: 'm',
                forecast_days: 5
            },
        });

        if (response.data.success === false) {
            // Simply return null or throw depending on how we want to handle it.
            // Let's throw so App.jsx knows forecast failed even if current weather succeeded.
            console.warn("Forecast fetch failed (likely plan limitation):", response.data.error.info);
            return null;
        }

        return response.data;
    } catch (error) {
        console.warn("Forecast fetch error:", error);
        return null;
    }
};

export const getHistoricalWeather = async (city, date) => {
    try {
        const response = await axios.get(`${BASE_URL}/historical`, {
            params: {
                query: city,
                access_key: API_KEY,
                historical_date: date,
                units: 'm',
            },
        });

        if (response.data.success === false) {
            // Throw to trigger catch block for mock fallback
            throw new Error(response.data.error.info);
        }

        return response.data;
    } catch (error) {
        console.warn("Historical API failed (likely plan limit). Returning mock data for demo.");

        // Mock Data Fallback
        return {
            success: true,
            is_mock: true, // Flag to show in UI
            historical: {
                [date]: {
                    date: date,
                    date_epoch: 1618012800,
                    avgtemp: Math.floor(Math.random() * (30 - 10) + 10), // Random temp 10-30
                    maxtemp: Math.floor(Math.random() * (35 - 20) + 20),
                    mintemp: Math.floor(Math.random() * (15 - 5) + 5),
                    sunhour: 10.5,
                    totalsnow: 0,
                    totallsnowcm: 0,
                    uv_index: 5,
                }
            }
        };
    }
};

export const getHistoricalWeatherRange = async (city, startDate, endDate) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const start = new Date(startDate);
    const end = new Date(endDate);
    const data = [];

    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        // Generate random realistic data
        const baseTemp = 20 + Math.random() * 10 - 5; // 15-25 range base
        data.push({
            date: dateStr,
            avgtemp: Math.round(baseTemp),
            maxtemp: Math.round(baseTemp + 5 + Math.random() * 3),
            mintemp: Math.round(baseTemp - 5 - Math.random() * 3),
            humidity: Math.round(40 + Math.random() * 40),
        });
    }

    return {
        success: true,
        is_mock: true,
        history: data
    };
};

export const getCitySuggestions = async (query) => {
    if (!query || query.length < 3) return [];

    try {
        const response = await axios.get(`${BASE_URL}/autocomplete`, {
            params: {
                query: query,
                access_key: API_KEY,
            },
        });

        if (response.data.success === false) {
            throw new Error("Autocomplete API failed");
        }

        // Response structure: { request: {}, results: [ { name: "City" }, ... ] }
        return response.data.results.map(item => item.name);
    } catch (error) {
        // Fallback to static list filtering for demo purposes
        return FALLBACK_CITIES.filter(city =>
            city.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
    }
};
