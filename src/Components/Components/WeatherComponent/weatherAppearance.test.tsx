import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import axios from 'axios';
import WeatherComponent from './WeatherComponent';
import { weatherAppearance } from './weatherAppearance';

jest.mock('axios', () => ({ get: jest.fn() }));

const day = 'https://cdn.weatherapi.com/weather/64x64/day/113.png';
const night = 'https://cdn.weatherapi.com/weather/64x64/night/113.png';

test.each([
  ['Sunny', 'sunny'],
  ['Clear', 'sunny'],
  ['Partly cloudy', 'partly-cloudy'],
  ['Overcast', 'cloudy'],
  ['Cloudy', 'cloudy'],
  ['Patchy rain nearby', 'rain'],
  ['Moderate or heavy rain shower', 'rain'],
  ['Light drizzle', 'rain'],
  ['Moderate or heavy freezing rain', 'snow'],
  ['Blizzard', 'snow'],
  ['Moderate or heavy sleet', 'snow'],
  ['Ice pellets', 'snow'],
  ['Patchy light snow', 'snow'],
  ['Freezing fog', 'fog'],
  ['Mist', 'fog'],
  ['Smoky haze', 'haze'],
  ['Severe sandstorm', 'haze'],
  ['Saharan dust', 'haze'],
  ['Severe smog', 'haze'],
  ['Moderate or heavy rain with thunder', 'storm'],
  ['Thundery outbreaks possible', 'storm'],
  ['Unknown condition', 'default'],
])(
  'groups %s into %s independently of time of day',
  (condition, theme) => {
    expect(weatherAppearance(condition, day)).toBe(
      `weather-theme-${theme} weather-period-day`
    );

    expect(weatherAppearance(condition, night)).toBe(
      `weather-theme-${theme} weather-period-night`
    );
  }
);

test('missing or untrusted icons do not invent a day/night period', () => {
  expect(weatherAppearance('Cloudy', '')).toBe(
    'weather-theme-cloudy weather-period-unknown'
  );

  expect(
    weatherAppearance(
      'Rain',
      night.replace('cdn.weatherapi.com', 'example.com')
    )
  ).toBe('weather-theme-rain weather-period-unknown');

  expect(weatherAppearance('Sunny', '')).toBe(
    'weather-theme-sunny weather-period-day'
  );

  expect(weatherAppearance('Clear', '')).toBe(
    'weather-theme-sunny weather-period-night'
  );
});

test('the card retains its nighttime theme and readings if the provider icon fails', async () => {
  (axios.get as jest.Mock).mockResolvedValue({
    data: {
      city: 'Paris',
      country: 'France',
      temperatureC: 8,
      condition: 'Light rain shower',
      conditionIcon: night,
      windSpeedKph: 10,
      humidity: 70,
      lastUpdated: '2026-11-24 22:00',
    },
  });

  render(<WeatherComponent city="Paris" />);

  const icon = await screen.findByRole('img', {
    name: 'Light rain shower',
  });

  expect(screen.getByRole('region', { name: 'Weather' })).toHaveClass(
    'weather-theme-rain',
    'weather-period-night'
  );

  fireEvent.error(icon);

  expect(screen.queryByRole('img')).not.toBeInTheDocument();

  expect(screen.getByRole('region', { name: 'Weather' })).toHaveClass(
    'weather-theme-rain',
    'weather-period-night'
  );

  expect(screen.getByText('8°C')).toBeInTheDocument();
});