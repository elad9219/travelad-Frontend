import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import HotelComponent from './HotelComponent';

jest.mock('axios', () => ({ get: jest.fn() }));

const get = axios.get as jest.Mock;
const realAxios = jest.requireActual('axios/dist/node/axios.cjs');
const hotel = {
  name: 'Example Hotel',
  hotelId: 'demo-1',
  price: 100,
  rating: 8,
  imageUrl: 'https://example.com/hotel.jpg',
};

beforeEach(() => {
  jest.clearAllMocks();
  get.mockReset().mockResolvedValue({ data: [hotel] });
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function show(cityName: string, onMap = jest.fn()) {
  render(
    <HotelComponent
      cityName={cityName}
      countryName=""
      onShowHotelOnMap={onMap}
    />
  );
}

function citySentOverTheWire(call: number) {
  const [url, config] = get.mock.calls[call];
  return new URL(realAxios.getUri({ url, params: config.params }))
    .searchParams.get('cityName');
}

test.each(['New York', 'São Paulo', 'A+B%20C', '東京'])(
  'preserves the city through actual Axios serialization: %s',
  async city => {
    show(city);
    await screen.findByRole('heading', { name: 'Example Hotel' });
    expect(citySentOverTheWire(0)).toBe(city);
  }
);

test('advanced search also sends the original city', async () => {
  show('New York');
  await screen.findByRole('heading', { name: 'Example Hotel' });
  fireEvent.click(screen.getByRole('button', { name: 'Advanced Search' }));
  fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  await screen.findByRole('heading', { name: 'Example Hotel' });
  expect(get).toHaveBeenCalledTimes(2);
  expect(citySentOverTheWire(1)).toBe('New York');
});

test('details and map fallback do not decode literal percent sequences', async () => {
  const onMap = jest.fn();
  show('A+B%20C', onMap);
  const heading = await screen.findByRole('heading', { name: 'Example Hotel' });
  fireEvent.click(heading);
  expect(screen.getByText('A+B%20C')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show on Map' }));
  expect(onMap).toHaveBeenCalledWith('Example Hotel, A+B%20C');
});

test('the external search link encodes the original city once', async () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  show('A+B%20C');
  fireEvent.click(await screen.findByRole('heading', { name: 'Example Hotel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Book on Booking.com' }));
  const url = new URL(open.mock.calls[0][0] as string);
  expect(url.searchParams.get('ss')).toBe('Example Hotel A+B%20C');
});

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: any) => void;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fillAdvanced(values: Record<string, string | undefined> = {}) {
  if (!screen.queryByLabelText('Check-In:')) {
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Search' }));
  }
  const fields = {
    'Check-In:': '2099-06-01', 'Check-Out:': '2099-06-04', 'Guests (1-9):': '2',
    ...values,
  };
  Object.entries(fields).forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
}

test('Strict Mode dispatches only one search', async () => {
  render(<React.StrictMode>
    <HotelComponent cityName="Paris" countryName="" onShowHotelOnMap={jest.fn()} />
  </React.StrictMode>);
  await screen.findByRole('heading', { name: 'Example Hotel' });
  expect(get).toHaveBeenCalledTimes(1);
  expect(get.mock.calls[0][1]).toEqual(expect.objectContaining({
    signal: expect.any(AbortSignal), timeout: 30000,
  }));
});

test('a late response cannot replace results for the next city', async () => {
  const first = deferred();
  get.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ data: [{ ...hotel, name: 'Tokyo Hotel' }] });
  const view = render(<HotelComponent cityName="Paris" countryName="" onShowHotelOnMap={jest.fn()} />);
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
  const signal = get.mock.calls[0][1].signal;
  view.rerender(<HotelComponent cityName="Tokyo" countryName="" onShowHotelOnMap={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Tokyo Hotel' });
  await act(async () => first.resolve({ data: [hotel] }));
  expect(signal.aborted).toBe(true);
  expect(screen.queryByRole('heading', { name: 'Example Hotel' })).not.toBeInTheDocument();
});

test('a late failure does not clear the next request loading state', async () => {
  const first = deferred();
  const next = deferred();
  get.mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);
  const view = render(<HotelComponent cityName="Paris" countryName="" onShowHotelOnMap={jest.fn()} />);
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
  view.rerender(<HotelComponent cityName="Tokyo" countryName="" onShowHotelOnMap={jest.fn()} />);
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  await act(async () => first.reject(new Error('Old failure')));
  expect(screen.getByRole('status', { name: 'Loading hotels' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await act(async () => next.resolve({ data: [hotel] }));
});

test('an advanced search supersedes the pending regular search', async () => {
  const regular = deferred();
  get.mockReturnValueOnce(regular.promise).mockResolvedValueOnce({ data: [{ ...hotel, name: 'Advanced Hotel' }] });
  show('Paris');
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
  fillAdvanced();
  submit();
  await screen.findByRole('heading', { name: 'Advanced Hotel' });
  await act(async () => regular.resolve({ data: [hotel] }));
  expect(screen.queryByRole('heading', { name: 'Example Hotel' })).not.toBeInTheDocument();
  expect(screen.getByText('3 nights')).toBeInTheDocument();
});

test('failed advanced searches retain inputs and retry the submitted snapshot', async () => {
  get.mockResolvedValueOnce({ data: [hotel] })
    .mockRejectedValueOnce({ response: { status: 400 } })
    .mockResolvedValueOnce({ data: [hotel] });
  show('Paris');
  await screen.findByRole('heading', { name: 'Example Hotel' });
  fillAdvanced();
  submit();
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Guests (1-9):')).toHaveValue(2);
  expect(screen.queryByRole('heading', { name: 'Example Hotel' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Guests (1-9):'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('heading', { name: 'Example Hotel' });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(get.mock.calls[2][1].params).toEqual(get.mock.calls[1][1].params);
  fireEvent.click(screen.getByRole('button', { name: 'Details for Example Hotel' }));
  expect(screen.getByText(/Guests:/).parentElement).toHaveTextContent('Guests: 2');
});

test('editing the draft during a request does not change result dates or guests', async () => {
  const advanced = deferred();
  get.mockResolvedValueOnce({ data: [hotel] }).mockReturnValueOnce(advanced.promise);
  show('Paris');
  await screen.findByRole('heading', { name: 'Example Hotel' });
  fillAdvanced();
  submit();
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  fireEvent.change(screen.getByLabelText('Guests (1-9):'), { target: { value: '9' } });
  fireEvent.change(screen.getByLabelText('Check-Out:'), { target: { value: '2099-06-09' } });
  await act(async () => advanced.resolve({ data: [hotel] }));
  fireEvent.click(screen.getByRole('button', { name: 'Details for Example Hotel' }));
  expect(screen.getByText('3 nights')).toBeInTheDocument();
  expect(screen.getByText(/Guests:/).parentElement).toHaveTextContent('Guests: 2');
  expect(screen.getByText(/Dates:/).parentElement).toHaveTextContent('01/06/2099 - 04/06/2099');
});

test('clearing check-in does not crash and blocks an invalid submission', async () => {
  show('Paris');
  await screen.findByRole('heading', { name: 'Example Hotel' });
  fillAdvanced({ 'Check-In:': '' });
  expect(screen.getByLabelText('Check-In:')).toHaveValue('');
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent('Enter valid dates');
  expect(get).toHaveBeenCalledTimes(1);
});

test.each([
  { 'Check-In:': '2000-01-01' },
  { 'Check-Out:': '' },
  { 'Check-Out:': '2099-06-01' },
  { 'Check-Out:': '2099-05-31' },
  { 'Guests (1-9):': '' },
])('invalid form input does not dispatch another request: %j', async values => {
  show('Paris');
  await screen.findByRole('heading', { name: 'Example Hotel' });
  fillAdvanced(values);
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent('Enter valid dates');
  expect(get).toHaveBeenCalledTimes(1);
});

test.each([
  { data: null }, { data: {} }, { data: [null] },
  { data: [{ ...hotel, price: '100' }] },
  { data: [{ ...hotel, rating: {} }] },
])('malformed responses are failures rather than empty results: %j', async ({ data }) => {
  get.mockResolvedValue({ data });
  show('Paris');
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load hotels');
  expect(screen.queryByText('No hotels found.')).not.toBeInTheDocument();
});

test('empty arrays are displayed as empty results', async () => {
  get.mockResolvedValue({ data: [] });
  show('Paris');
  await screen.findByText('No hotels found.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('supports the legacy public backend empty-result status', async () => {
  get.mockRejectedValue({ response: { status: 404 } });
  show('Paris');
  await screen.findByText('No hotels found.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a city change resets the advanced dates and guest count', async () => {
  const view = render(<HotelComponent cityName="Paris" countryName="" onShowHotelOnMap={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Example Hotel' });
  fillAdvanced();
  submit();
  await screen.findByText('3 nights');
  view.rerender(<HotelComponent cityName="Tokyo" countryName="" onShowHotelOnMap={jest.fn()} />);
  await screen.findByText('1 night');
  expect(get.mock.calls[2][1].params.adults).toBe('1');
});

test('defaults use the local calendar day and a following checkout day', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2099, 5, 1, 23, 30));
  show('Paris');
  await act(async () => {});
  expect(get.mock.calls[0][1].params).toEqual(expect.objectContaining({
    checkInDate: '2099-06-01', checkOutDate: '2099-06-02',
  }));
});

test('failures are retried only after an explicit user action', async () => {
  jest.useFakeTimers();
  get.mockRejectedValue(new Error('Unavailable'));
  show('Paris');
  await act(async () => {});
  expect(screen.getByRole('alert')).toBeInTheDocument();
  await act(async () => jest.advanceTimersByTime(90000));
  expect(get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => {});
  expect(get).toHaveBeenCalledTimes(2);
});

test('unmounting aborts the pending request', async () => {
  const pending = deferred();
  get.mockReturnValue(pending.promise);
  const view = render(<HotelComponent cityName="Paris" countryName="" onShowHotelOnMap={jest.fn()} />);
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
  const signal = get.mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve({ data: [hotel] }));
});

test.each([
  { latitude: 51.5, longitude: -0.12 },
  { latitude: 0, longitude: 30 },
  { latitude: 30, longitude: 0 },
])('map actions accept valid coordinates near a zero axis: %j', async coordinates => {
  get.mockResolvedValue({ data: [{ ...hotel, ...coordinates }] });
  const onMap = jest.fn();
  show('London', onMap);
  fireEvent.click(await screen.findByRole('button', { name: 'Show on Map' }));
  expect(onMap).toHaveBeenCalledWith(`${coordinates.latitude},${coordinates.longitude}`);
  expect(screen.queryByRole('button', { name: 'Book on Booking.com' })).not.toBeInTheDocument();
});

test.each([
  { latitude: undefined, longitude: undefined },
  { latitude: 91, longitude: 2 },
  { latitude: 48, longitude: 181 },
])('demo hotels without usable coordinates explicitly show the city: %j', async coordinates => {
  get.mockResolvedValue({ data: [{ ...hotel, hotelId: 'MOCK_1', ...coordinates }] });
  const onMap = jest.fn();
  show('Paris', onMap);
  fireEvent.click(await screen.findByRole('button', { name: 'Show City on Map' }));
  expect(onMap).toHaveBeenCalledWith('Paris');
});

test('showing a hotel scrolls to the map container', async () => {
  const map = document.createElement('div');
  map.className = 'place-map-container';
  map.scrollIntoView = jest.fn();
  document.body.appendChild(map);
  try {
    show('Paris');
    fireEvent.click(await screen.findByRole('button', { name: 'Show on Map' }));
    expect(map.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  } finally {
    map.remove();
  }
});