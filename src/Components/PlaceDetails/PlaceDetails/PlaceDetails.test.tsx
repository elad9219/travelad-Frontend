import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link as MockLink, MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PlaceDetails from './PlaceDetails';
import { warmBackend, waitForBackend } from '../../../utils/backendReadiness';

jest.mock('../../../utils/backendReadiness', () => ({
  warmBackend: jest.fn(),
  waitForBackend: jest.fn(),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('../../Components/SearchBar/SearchBar', () => ({ onSearch }: any) => (
  <nav>
    <button onClick={() => onSearch('Tokyo')}>Tokyo</button>
    <button onClick={() => onSearch(' Paris ')}>Paris</button>
    <MockLink to="/">Home</MockLink>
  </nav>
));

jest.mock('../../Components/MapComponent/MapComponent', () => ({ query }: any) => (
  <div data-testid="map">{query}</div>
));

jest.mock(
  '../../Components/WeatherComponent/WeatherComponent',
  () => ({ city }: any) => <div data-testid="weather">{city}</div>
);

jest.mock(
  '../../Components/HotelComponent/HotelComponent',
  () => ({ cityName }: any) => <div data-testid="hotels">{cityName}</div>
);

jest.mock(
  '../../Components/AttractionComponent/AttractionComponent',
  () => ({ city }: any) => <div data-testid="attractions">{city}</div>
);

jest.mock(
  '../../Components/FlightComponent/FlightComponent',
  () => ({ city }: any) => <div data-testid="flights">{city}</div>
);

jest.mock('../../Components/Loader/Loader', () => () => <span>Loading</span>);

const get = axios.get as jest.Mock;

const place = (name: string) => ({
  name,
  placeId: `id_${name}`,
  country: 'Country',
});

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: Error) => void;

  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });

  return { promise, resolve, reject };
}

function show(path = '/Tokyo', strict = false) {
  const view = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<PlaceDetails />} />
        <Route path="/:cityName" element={<PlaceDetails />} />
      </Routes>
    </MemoryRouter>
  );

  return render(strict ? <React.StrictMode>{view}</React.StrictMode> : view);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (warmBackend as jest.Mock).mockResolvedValue(undefined);
  (waitForBackend as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

test('qualified direct routes keep the chosen city in all cards', async () => {
  const query = 'Paris, Texas, United States';

  get.mockResolvedValue({
    data: {
      ...place('Paris'),
      latitude: 33.66,
      longitude: -95.55,
    },
  });

  show('/' + encodeURIComponent(query));

  expect(await screen.findByTestId('flights')).toHaveTextContent(query);
  expect(screen.getByTestId('hotels')).toHaveTextContent(query);
  expect(screen.getByTestId('attractions')).toHaveTextContent(query);
  expect(screen.getByTestId('map')).toHaveTextContent('place_id:id_Paris');
  expect(screen.getByTestId('weather')).toHaveTextContent('33.66,-95.55');
  expect(get.mock.calls[0][1].params.city).toBe(query);
});

test('loads a direct route once in Strict Mode without a duplicate history write', async () => {
  get.mockResolvedValue({ data: place('Tokyo') });

  show('/Tokyo', true);

  expect(await screen.findByTestId('weather')).toHaveTextContent('Tokyo');
  expect(get).toHaveBeenCalledTimes(1);

  expect(get.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      params: {
        city: 'Tokyo',
        userId: expect.any(String),
      },
      signal: expect.any(AbortSignal),
      timeout: 60000,
    })
  );

  expect(axios.post).not.toHaveBeenCalled();
});

test('aborts a previous city and ignores its late success', async () => {
  const tokyo = deferred();
  const paris = deferred();

  get.mockReturnValueOnce(tokyo.promise).mockReturnValueOnce(paris.promise);

  show();

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
  const signal = get.mock.calls[0][1].signal;

  fireEvent.click(screen.getByRole('button', { name: 'Paris' }));

  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

  expect(signal.aborted).toBe(true);
  expect(get.mock.calls[1][1].params.city).toBe('Paris');

  await act(async () => paris.resolve({ data: place('Paris') }));
  await act(async () => tokyo.resolve({ data: place('Tokyo') }));

  expect(screen.getByTestId('weather')).toHaveTextContent('Paris');
  expect(screen.getByTestId('map')).toHaveTextContent('Paris');
});

test('a late failure cannot clear a newer search loading state', async () => {
  const tokyo = deferred();
  const paris = deferred();

  get.mockReturnValueOnce(tokyo.promise).mockReturnValueOnce(paris.promise);

  show();

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole('button', { name: 'Paris' }));

  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

  await act(async () => tokyo.reject(new Error('Old failure')));

  expect(screen.getByRole('status')).toHaveTextContent('Loading place details');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  await act(async () => paris.resolve({ data: place('Paris') }));

  expect(screen.getByTestId('weather')).toHaveTextContent('Paris');
});

test('a failed request is not replayed automatically and can be retried manually', async () => {
  jest.useFakeTimers();

  get.mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce({ data: place('Tokyo') });

  show();

  await act(async () => {});

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to load details for Tokyo'
  );

  await act(async () => jest.advanceTimersByTime(90000));

  expect(get).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => {});

  expect(screen.getByTestId('weather')).toHaveTextContent('Tokyo');
  expect(get).toHaveBeenCalledTimes(2);
});

test.each([
  { name: 'Tokyo', placeId: 'unknown_Tokyo' },
  { name: 'Tokyo' },
  null,
])('does not cache unavailable or malformed data: %j', async data => {
  get.mockResolvedValueOnce({ data })
    .mockResolvedValueOnce({ data: place('Tokyo') });

  show();

  expect(await screen.findByRole('alert')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Tokyo' }));

  expect(await screen.findByTestId('weather')).toHaveTextContent('Tokyo');
  expect(get).toHaveBeenCalledTimes(2);
});

test('reuses successful city data and restores the city map query', async () => {
  get.mockImplementation((_url, { params }) =>
    Promise.resolve({ data: place(params.city) })
  );

  show();

  await screen.findByTestId('weather');

  fireEvent.click(screen.getByRole('button', { name: 'Paris' }));

  await waitFor(() =>
    expect(screen.getByTestId('weather')).toHaveTextContent('Paris')
  );

  fireEvent.click(screen.getByRole('button', { name: 'Tokyo' }));

  await waitFor(() =>
    expect(screen.getByTestId('weather')).toHaveTextContent('Tokyo')
  );

  expect(screen.getByTestId('map')).toHaveTextContent('Tokyo');
  expect(get).toHaveBeenCalledTimes(2);
});

test('returning home cancels a search and clears its timer and late response', async () => {
  jest.useFakeTimers();

  const request = deferred();
  get.mockReturnValue(request.promise);

  show();

  await act(async () => {});

  const signal = get.mock.calls[0][1].signal;

  await act(async () => jest.advanceTimersByTime(3000));

  expect(screen.getByRole('status')).toHaveTextContent(
    'This search is taking longer than usual'
  );

  fireEvent.click(screen.getByRole('link', { name: 'Home' }));

  expect(signal.aborted).toBe(true);

  await act(async () => {
    jest.advanceTimersByTime(10000);
    request.resolve({ data: place('Tokyo') });
  });

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByTestId('weather')).not.toBeInTheDocument();
});

test('unmounting cancels the pending request', async () => {
  const request = deferred();
  get.mockReturnValue(request.promise);

  const view = show();

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  const signal = get.mock.calls[0][1].signal;

  view.unmount();

  expect(signal.aborted).toBe(true);

  await act(async () => request.resolve({ data: place('Tokyo') }));
});

test('does not decode percent signs a second time', async () => {
  get.mockResolvedValue({ data: place('City%') });

  show('/City%25');

  await screen.findByTestId('weather');

  expect(get.mock.calls[0][1].params.city).toBe('City%');
});

test('warms silently on the homepage without dispatching a search', async () => {
  show('/');

  await act(async () => {});

  expect(warmBackend).toHaveBeenCalled();
  expect(get).not.toHaveBeenCalled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('waits for readiness before sending one search', async () => {
  const readiness = deferred();

  (waitForBackend as jest.Mock).mockReturnValue(readiness.promise);
  get.mockResolvedValue({ data: place('Tokyo') });

  show();

  await waitFor(() => expect(waitForBackend).toHaveBeenCalled());

  expect(get).not.toHaveBeenCalled();

  await act(async () => readiness.resolve(undefined));

  expect(await screen.findByTestId('weather')).toHaveTextContent('Tokyo');
  expect(get).toHaveBeenCalledTimes(1);
});

test('readiness failure permits manual retry without having sent a search', async () => {
  (waitForBackend as jest.Mock).mockRejectedValueOnce(
    new Error('Unavailable')
  );

  get.mockResolvedValue({ data: place('Tokyo') });

  show();

  await screen.findByRole('alert');

  expect(get).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByTestId('weather')).toHaveTextContent('Tokyo');
  expect(get).toHaveBeenCalledTimes(1);
});

test('leaving during warm-up prevents the pending search from being sent', async () => {
  const readiness = deferred();

  (waitForBackend as jest.Mock).mockReturnValue(readiness.promise);

  show();

  await waitFor(() => expect(waitForBackend).toHaveBeenCalled());

  fireEvent.click(screen.getByRole('link', { name: 'Home' }));

  await act(async () => readiness.resolve(undefined));

  expect(get).not.toHaveBeenCalled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('shows server waiting only during an active search awaiting readiness', async () => {
  jest.useFakeTimers();

  const readiness = deferred();
  const request = deferred();

  (waitForBackend as jest.Mock).mockReturnValue(readiness.promise);
  get.mockReturnValue(request.promise);

  show();

  await act(async () => {});
  await act(async () => jest.advanceTimersByTime(3000));

  expect(screen.getByRole('status')).toHaveTextContent(
    'Waiting for the demo server'
  );

  await act(async () => readiness.resolve(undefined));

  expect(screen.getByRole('status')).toHaveTextContent(
    'This search is taking longer'
  );

  expect(screen.getByRole('status')).not.toHaveTextContent(
    'Waiting for the demo server'
  );

  await act(async () => request.resolve({ data: place('Tokyo') }));

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});