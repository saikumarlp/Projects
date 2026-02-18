import React, { useState, useEffect } from 'react';
import { getWeather, getForecast } from './services/weatherService';
import SearchBar from './components/SearchBar';
import CurrentWeather from './components/CurrentWeather';
import Forecast from './components/Forecast';
import SearchHistory from './components/SearchHistory';
import HistoricalWeather from './components/HistoricalWeather';
import Loader from './components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { Container, Button, Alert } from 'react-bootstrap';

function App() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [unit, setUnit] = useState('metric');

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    setHistory(savedHistory);
  }, []);

  const fetchWeatherData = async (city) => {
    setLoading(true);
    setError('');
    try {
      const weatherData = await getWeather(city);
      const forecastData = await getForecast(city);

      setWeather(weatherData);
      setForecast(forecastData);
      addToHistory(city);
    } catch (err) {
      setError('City not found. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (city) => {
    let newHistory = [city, ...history.filter(h => h.toLowerCase() !== city.toLowerCase())];
    newHistory = newHistory.slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('weatherHistory', JSON.stringify(newHistory));
  };

  const convertTemp = (temp, toUnit) => {
    if (toUnit === 'imperial') {
      return (temp * 9 / 5) + 32;
    }
    return temp;
  };

  const getDisplayData = () => {
    if (!weather) return null;

    if (unit === 'metric') return { weather, forecast };

    // Convert Weather
    const convertedWeather = {
      ...weather,
      current: {
        ...weather.current,
        temperature: convertTemp(weather.current.temperature, 'imperial'),
        feelslike: convertTemp(weather.current.feelslike, 'imperial'),
        wind_speed: weather.current.wind_speed * 0.621371,
      }
    };

    // Convert Forecast
    let convertedForecast = forecast;
    if (forecast && forecast.forecast) {
      const newForecastObj = {};
      Object.entries(forecast.forecast).forEach(([date, dayData]) => {
        newForecastObj[date] = {
          ...dayData,
          maxtemp: convertTemp(dayData.maxtemp, 'imperial'),
          mintemp: convertTemp(dayData.mintemp, 'imperial'),
          avgtemp: convertTemp(dayData.avgtemp, 'imperial'),
        };
      });
      convertedForecast = { ...forecast, forecast: newForecastObj };
    }

    return { weather: convertedWeather, forecast: convertedForecast };
  };

  const displayData = getDisplayData();

  // Dynamic Background Logic
  const getBackgroundClass = () => {
    if (!weather) return 'bg-default';
    const code = weather.current.weather_code;
    const isDay = weather.current.is_day === 'yes';

    if (!isDay) return 'bg-night';
    if (code === 113) return 'bg-sunny'; // Sunny
    if (code >= 200 && code <= 350) return 'bg-rain'; // Rain
    return 'bg-default'; // Default/Cloudy
  };

  return (
    <div className={`App min-vh-100 d-flex flex-column py-5 ${getBackgroundClass()}`}>
      <Container>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-4 p-md-5 mx-auto"
          style={{ maxWidth: '1000px' }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 font-weight-bold mb-0">Weather Canvas</h1>
            <div className="d-flex gap-2">
              <Button
                variant="light"
                onClick={() => setUnit(unit === 'metric' ? 'imperial' : 'metric')}
                className="glass-btn font-weight-bold"
              >
                °{unit === 'metric' ? 'F' : 'C'}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <SearchBar onSearch={fetchWeatherData} />
            <SearchHistory history={history} onSelect={fetchWeatherData} />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="d-flex justify-content-center py-5"
              >
                <Loader />
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="danger" className="text-center">{error}</Alert>
              </motion.div>
            )}

            {displayData?.weather && !loading && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="d-flex flex-column gap-5"
              >
                <CurrentWeather data={displayData.weather} unit={unit} />

                {displayData.forecast && (
                  <Forecast data={displayData.forecast} unit={unit} />
                )}

                <HistoricalWeather locationName={displayData.weather.location.name} />
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </Container>
    </div>
  );
}

export default App;
