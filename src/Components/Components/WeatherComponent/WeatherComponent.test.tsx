import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import WeatherComponent from './WeatherComponent';

jest.mock('axios', () => ({ get: jest.fn() }));

const get = axios.get as jest.Mock;
const realAxios = jest.requireActual('axios/dist/node/axios.cjs');
const icon = '//cdn.weatherapi.com/weather/64x64/day/113.png';

const weather = {
  city: 'Paris',
  country: 'France',
  temperatureC: 20,
  condition: 'Sunny',
  conditionIcon: icon,
  windSpeedKph: 10,
  humidity: 50,
  lastUpdated: '2026-11-16 12:00',
};

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: any) => void;

  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: weather });
});

afterEach(() => jest.useRealTimers());

test.each(['New York', 'São Paulo', 'A+B%20C', '東京'])(
  'preserves city names through actual Axios serialization: %s',
  async city => {
    render(<WeatherComponent city={city} />);

    await screen.findByRole('heading', { name: 'Paris, France' });

    const [url, config] = get.mock.calls[0];
    const sent = new URL(realAxios.getUri({ url, params: config.params }));

    expect(sent.searchParams.get('city')).toBe(city);
  }
);

test('Strict Mode dispatches one bounded request', async () => {
  render(
    <React.StrictMode>
      <WeatherComponent city="Paris" />
    </React.StrictMode>
  );

  await screen.findByRole('heading', { name: 'Paris, France' });

  expect(get).toHaveBeenCalledTimes(1);
  expect(get.mock.calls[0][1]).toEqual(expect.objectContaining({
    timeout: 30000,
    signal: expect.any(AbortSignal),
  }));
});

test('a late response cannot replace weather for the next city', async () => {
  const first = deferred();
  const next = deferred();

  get.mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);

  const view = render(<WeatherComponent city="Paris" />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  const signal = get.mock.calls[0][1].signal;

  view.rerender(<WeatherComponent city="Tokyo" />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  await act(async () => first.resolve({ data: weather }));

  expect(screen.getByRole('status')).toHaveTextContent('Loading weather');
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();

  await act(async () => next.resolve({
    data: { ...weather, city: 'Tokyo', country: 'Japan' },
  }));

  expect(signal.aborted).toBe(true);
  expect(
    screen.getByRole('heading', { name: 'Tokyo, Japan' })
  ).toBeInTheDocument();
});

test('a late failure cannot clear the next request loading state', async () => {
  const first = deferred();
  const next = deferred();

  get.mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);

  const view = render(<WeatherComponent city="Paris" />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  view.rerender(<WeatherComponent city="Tokyo" />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  await act(async () => first.reject(new Error('Old failure')));

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();

  await act(async () => next.resolve({ data: weather }));
});

test('changing city clears previous weather and a manual retry recovers', async () => {
  get.mockResolvedValueOnce({ data: weather })
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({
      data: { ...weather, city: 'Tokyo', country: 'Japan' },
    });

  const view = render(<WeatherComponent city="Paris" />);

  await screen.findByRole('heading', { name: 'Paris, France' });

  view.rerender(<WeatherComponent city="Tokyo" />);

  await screen.findByRole('alert');

  expect(screen.queryByRole('heading')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  await screen.findByRole('heading', { name: 'Tokyo, Japan' });

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(get.mock.calls[2][1].params).toEqual({ city: 'Tokyo' });
});

test.each([
  { status: 404, text: 'Weather is unavailable for this location.' },
  { status: 400, text: 'Enter a valid city and try again.' },
  { status: 502, text: 'Unable to load weather. Please try again.' },
])('distinguishes backend error status $status', async ({ status, text }) => {
  get.mockRejectedValue({ response: { status } });

  render(<WeatherComponent city="Paris" />);

  expect(await screen.findByRole('alert')).toHaveTextContent(text);
});

test.each([
  { data: null },
  { data: [] },
  { data: {} },
  { data: { ...weather, city: '' } },
  { data: { ...weather, temperatureC: '20' } },
  { data: { ...weather, temperatureC: Infinity } },
  { data: { ...weather, humidity: 101 } },
  { data: { ...weather, humidity: 50.5 } },
  { data: { ...weather, windSpeedKph: -1 } },
])('malformed readings do not appear as valid weather: %j', async ({ data }) => {
  get.mockResolvedValue({ data });

  render(<WeatherComponent city="Paris" />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load weather'
  );
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});

test('zero temperature, humidity and wind are valid readings', async () => {
  get.mockResolvedValue({
    data: {
      ...weather,
      temperatureC: 0,
      humidity: 0,
      windSpeedKph: 0,
    },
  });

  render(<WeatherComponent city="Paris" />);

  await screen.findByRole('heading', { name: 'Paris, France' });

  expect(screen.getByText('0°C')).toBeInTheDocument();
  expect(screen.getByText('Humidity: 0%')).toBeInTheDocument();
  expect(screen.getByText('Wind Speed: 0 km/h')).toBeInTheDocument();
});

test.each([icon, `http:${icon}`, `https:${icon}`])(
  'uses HTTPS for the provider icon: %s',
  async conditionIcon => {
    get.mockResolvedValue({ data: { ...weather, conditionIcon } });

    render(<WeatherComponent city="Paris" />);

    expect(
      await screen.findByRole('img', { name: 'Sunny' })
    ).toHaveAttribute('src', `https:${icon}`);
  }
);

test.each([
  '',
  'javascript:alert(1)',
  'data:image/svg+xml,example',
  'https://cdn.weatherapi.com.evil.example/weather.png',
  'https://cdn.weatherapi.com@evil.example/weather.png',
  'https://user:password@cdn.weatherapi.com/weather.png',
])(
  'an unavailable or unsafe icon does not discard weather: %s',
  async conditionIcon => {
    get.mockResolvedValue({ data: { ...weather, conditionIcon } });

    render(<WeatherComponent city="Paris" />);

    await screen.findByRole('heading', { name: 'Paris, France' });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  }
);

test('a broken icon is removed and can load again for a new city', async () => {
  const view = render(<WeatherComponent city="Paris" />);

  fireEvent.error(await screen.findByRole('img', { name: 'Sunny' }));

  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Paris, France' })
  ).toBeInTheDocument();

  get.mockResolvedValue({
    data: { ...weather, city: 'Tokyo', country: 'Japan' },
  });

  view.rerender(<WeatherComponent city="Tokyo" />);

  await screen.findByRole('heading', { name: 'Tokyo, Japan' });

  expect(screen.getByRole('img')).toBeInTheDocument();
});

test('missing optional metadata leaves valid readings visible', async () => {
  get.mockResolvedValue({
    data: {
      ...weather,
      conditionIcon: undefined,
      lastUpdated: undefined,
    },
  });

  render(<WeatherComponent city="Paris" />);

  await screen.findByRole('heading', { name: 'Paris, France' });

  expect(
    screen.getByText('Last Updated: Unavailable')
  ).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('blank cities do not start a request or leave an endless loader', () => {
  render(<WeatherComponent city=" " />);

  expect(
    screen.getByText('Search for a city to see the weather.')
  ).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(get).not.toHaveBeenCalled();
});

test('clearing a city aborts its pending request and ignores its result', async () => {
  const pending = deferred();
  get.mockReturnValue(pending.promise);

  const view = render(<WeatherComponent city="Paris" />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  const signal = get.mock.calls[0][1].signal;

  view.rerender(<WeatherComponent city="" />);

  await act(async () => pending.resolve({ data: weather }));

  expect(signal.aborted).toBe(true);
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('failure does not cause automatic replay', async () => {
  jest.useFakeTimers();
  get.mockRejectedValue(new Error('Unavailable'));

  render(<WeatherComponent city="Paris" />);

  await act(async () => {});

  expect(screen.getByRole('alert')).toBeInTheDocument();

  await act(async () => jest.advanceTimersByTime(90000));

  expect(get).toHaveBeenCalledTimes(1);
});

test('unmounting aborts the request', async () => {
  const pending = deferred();
  get.mockReturnValue(pending.promise);

  const view = render(<WeatherComponent city="Paris" />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  const signal = get.mock.calls[0][1].signal;

  view.unmount();

  expect(signal.aborted).toBe(true);

  await act(async () => pending.resolve({ data: weather }));
});