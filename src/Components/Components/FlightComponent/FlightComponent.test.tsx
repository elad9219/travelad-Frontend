import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import axios from 'axios';
import FlightsComponent from './FlightComponent';
import globals from '../../../utils/globals';

jest.mock('axios', () => ({ get: jest.fn() }));

const get = axios.get as jest.Mock;
const search = jest.fn();

const segment = (origin = 'TLV', destination = 'PAR') => ({
  origin,
  destination,
  departureDate: '2099-06-01T08:00:00',
  arrivalDate: '2099-06-01T12:00:00',
  duration: 'PT4H',
  carrierCode: 'LY',
  flightNumber: '100',
  aircraft: '320',
  aircraftFullName: 'Airbus A320',
});

const flight = (price = 100) => ({
  price,
  segments: [segment()],
});

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: any) => void;

  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });

  return { promise, resolve, reject };
}

function fillAdvanced(
  values: Record<string, string | undefined> = {}
) {
  if (!screen.queryByLabelText('Destination:')) {
    fireEvent.click(
      screen.getByRole('button', { name: 'Advanced Search' })
    );
  }

  const fields = {
    'Origin:': 'Tel Aviv',
    'Destination:': 'Paris',
    'Depart Date:': '2099-06-01',
    'Return Date:': '2099-06-08',
    'Adults:': '2',
    ...values,
  };

  Object.entries(fields).forEach(([label, value]) => {
    const input = screen.queryByLabelText(label);

    if (input) {
      fireEvent.change(input, { target: { value } });
    }
  });
}

function submit() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Search', exact: true })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  search.mockReset().mockResolvedValue({ data: [flight()] });

  get.mockImplementation((url, config) =>
    url === globals.api.iataCodes
      ? Promise.resolve({ data: [] })
      : search(url, config)
  );
});

afterEach(() => jest.useRealTimers());

test('dispatches one regular search in Strict Mode', async () => {
  render(
    <React.StrictMode>
      <FlightsComponent city="Paris" />
    </React.StrictMode>
  );

  await screen.findByText('€100.00');

  expect(search).toHaveBeenCalledTimes(1);
  expect(
    get.mock.calls.filter(([url]) => url === globals.api.iataCodes)
  ).toHaveLength(1);

  expect(search.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      timeout: 30000,
      signal: expect.any(AbortSignal),
    })
  );
});

test('a late regular response cannot replace an advanced search', async () => {
  const regular = deferred();
  const advanced = deferred();

  search
    .mockReturnValueOnce(regular.promise)
    .mockReturnValueOnce(advanced.promise);

  render(<FlightsComponent city="Paris" />);

  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  const signal = search.mock.calls[0][1].signal;

  fillAdvanced();
  submit();

  await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  expect(signal.aborted).toBe(true);

  await act(async () => advanced.resolve({ data: [flight(888)] }));
  await act(async () => regular.resolve({ data: [flight(111)] }));

  expect(screen.getByText('Total: €888.00')).toBeInTheDocument();
  expect(screen.queryByText('€111.00')).not.toBeInTheDocument();
});

test('a late failure cannot clear the next city loading state', async () => {
  const first = deferred();
  const next = deferred();

  search
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(next.promise);

  const view = render(<FlightsComponent city="Paris" />);

  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));

  view.rerender(<FlightsComponent city="Tokyo" />);

  await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  await act(async () => first.reject(new Error('Old failure')));

  expect(
    screen.getByRole('status', { name: 'Loading flights' })
  ).toBeInTheDocument();

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  await act(async () => next.resolve({ data: [flight(222)] }));

  expect(screen.getByText('€222.00')).toBeInTheDocument();
});

test('changing cities cancels advanced results and resets passenger pricing', async () => {
  const advanced = deferred();

  search
    .mockResolvedValueOnce({ data: [flight()] })
    .mockReturnValueOnce(advanced.promise)
    .mockResolvedValueOnce({ data: [flight(222)] });

  const view = render(<FlightsComponent city="Paris" />);

  await screen.findByText('€100.00');

  fillAdvanced();
  submit();

  await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  const signal = search.mock.calls[1][1].signal;

  view.rerender(<FlightsComponent city="Tokyo" />);

  await screen.findByText('€222.00');
  expect(signal.aborted).toBe(true);

  await act(async () => advanced.resolve({ data: [flight(888)] }));

  expect(screen.queryByText('Total: €888.00')).not.toBeInTheDocument();
  expect(screen.getByText('€222.00')).toBeInTheDocument();
});

test('advanced failure retains the form and manual retry clears the error', async () => {
  search
    .mockResolvedValueOnce({ data: [flight()] })
    .mockRejectedValueOnce({ response: { status: 400 } })
    .mockResolvedValueOnce({ data: [flight(600)] });

  render(<FlightsComponent city="Paris" />);

  await screen.findByText('€100.00');

  fillAdvanced();
  submit();

  await screen.findByRole('alert');

  expect(screen.getByLabelText('Destination:')).toHaveValue('Paris');
  expect(screen.getByLabelText('Adults:')).toHaveValue(2);
  expect(screen.queryByText('€100.00')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  await screen.findByText('Total: €600.00');

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(search.mock.calls[2][1].params).toEqual(
    search.mock.calls[1][1].params
  );
});

test('a new advanced search can recover from a regular search failure', async () => {
  search
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({ data: [flight(600)] });

  render(<FlightsComponent city="Paris" />);

  await screen.findByRole('alert');

  fillAdvanced();
  submit();

  await screen.findByText('Total: €600.00');

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('one-way submissions omit the return date and preserve the city name', async () => {
  render(<FlightsComponent city="New York" />);

  await screen.findByText('€100.00');

  fillAdvanced({ 'Destination:': ' New York ' });

  fireEvent.click(screen.getByRole('radio', { name: 'One-Way' }));
  submit();

  await screen.findByText('Total: €100.00');

  expect(search.mock.calls[1][1].params).toEqual(
    expect.objectContaining({
      destination: 'New York',
      returnDate: '',
      adults: '2',
    })
  );
});

test.each([
  { 'Destination:': '' },
  { 'Depart Date:': '2000-01-01' },
  { 'Return Date:': '2099-05-01' },
  { 'Origin:': 'Paris' },
  { 'Adults:': '' },
])(
  'invalid form input does not dispatch another request: %j',
  async values => {
    render(<FlightsComponent city="Paris" />);

    await screen.findByText('€100.00');

    fillAdvanced(values);
    submit();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Check the highlighted'
    );

    expect(search).toHaveBeenCalledTimes(1);
  }
);

test.each([
  { data: null },
  { data: {} },
  { data: 'unexpected response' },
  { data: [null] },
  { data: [{ price: 100, segments: [] }] },
  { data: [{ ...flight(), outboundDuration: 123 }] },
  {
    data: [
      {
        ...flight(),
        segments: [{ ...segment(), carrierCode: {} }],
      },
    ],
  },
])(
  'malformed responses are failures rather than empty results: %j',
  async ({ data }) => {
    search.mockResolvedValue({ data });

    render(<FlightsComponent city="Paris" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load flights'
    );

    expect(
      screen.queryByText('No flights found.')
    ).not.toBeInTheDocument();
  }
);

test.each([
  { data: [] },
  { data: 'No IATA code found for the specified city.' },
])(
  'supports empty results from the current and legacy backend: %j',
  async ({ data }) => {
    search.mockResolvedValue({ data });

    render(<FlightsComponent city="Unknown" />);

    await screen.findByText('No flights found.');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  }
);

test('optional IATA metadata failure does not prevent flight results', async () => {
  get.mockImplementation((url, config) =>
    url === globals.api.iataCodes
      ? Promise.reject(new Error('Metadata unavailable'))
      : search(url, config)
  );

  render(<FlightsComponent city="Paris" />);

  await screen.findByText('€100.00');

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('details remain accessible by keyboard', async () => {
  render(<FlightsComponent city="Paris" />);

  const details = await screen.findByRole('button', {
    name: 'Flight 1 details',
  });

  fireEvent.keyDown(details, { key: 'Enter' });

  expect(details).toHaveAttribute('aria-expanded', 'true');
  expect(
    screen.getByRole('heading', { name: 'Flight', exact: true })
  ).toBeInTheDocument();

  fireEvent.keyDown(details, { key: ' ' });

  expect(details).toHaveAttribute('aria-expanded', 'false');
});

test('direct filtering and price sorting handle one-way and round-trip offers', async () => {
  const connection = {
    price: 100,
    segments: [
      segment('TLV', 'LHR'),
      segment('LHR', 'PAR'),
    ],
  };

  const roundTrip = {
    ...flight(200),
    outboundSegments: [segment()],
    returnSegments: [segment('PAR', 'TLV')],
  };

  search.mockResolvedValue({
    data: [flight(300), connection, roundTrip],
  });

  render(<FlightsComponent city="Paris" />);

  await screen.findByText('€300.00');

  fireEvent.click(
    screen.getByRole('button', { name: 'Direct Flights Only' })
  );

  fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'price' } });

  const offers = screen.getAllByRole('button', {
    name: /Flight \d+ details/,
  });

  expect(offers).toHaveLength(2);
  expect(offers[0]).toHaveTextContent('€200.00');
  expect(offers[1]).toHaveTextContent('€300.00');
  fireEvent.click(offers[0]);
  expect(offers[0]).toHaveAttribute('aria-expanded', 'true');
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'default' } });
  expect(screen.getByRole('button', { name: 'Flight 1 details' })).toHaveTextContent('€300.00');
  expect(screen.getByRole('button', { name: 'Flight 1 details' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Flight 1 details' }));
  fireEvent.click(screen.getByRole('button', { name: 'Direct Flights Only' }));
  expect(screen.getByRole('button', { name: 'Flight 1 details' })).toHaveAttribute('aria-expanded', 'false');
  expect(search).toHaveBeenCalledTimes(1);
});

test('flight sorting supports value, duration and departure without another request', async () => {
  const offer = (price: number, duration: string, departureDate: string) => ({
    price, outboundDuration: duration, segments: [{ ...segment(), departureDate }]
  });
  search.mockResolvedValue({ data: [
    offer(100, 'PT10H', '2099-06-01T10:00:00'),
    offer(150, 'PT4H', '2099-06-01T09:00:00'),
    offer(400, 'PT3H', '2099-06-01T07:00:00'),
  ] });
  render(<FlightsComponent city="Paris" />);
  await screen.findByText('€100.00');
  const sort = screen.getByRole('combobox', { name: 'Sort by' });
  for (const [value, expected] of [['value', '€150.00'], ['duration', '€400.00'], ['departure', '€400.00'], ['default', '€100.00']]) {
    fireEvent.change(sort, { target: { value } });
    expect(screen.getByRole('button', { name: 'Flight 1 details' })).toHaveTextContent(expected);
  }
  expect(search).toHaveBeenCalledTimes(1);
});

test('failure does not trigger automatic replay', async () => {
  jest.useFakeTimers();
  search.mockRejectedValue(new Error('Unavailable'));

  render(<FlightsComponent city="Paris" />);

  await act(async () => {});

  expect(screen.getByRole('alert')).toBeInTheDocument();

  await act(async () => jest.advanceTimersByTime(90000));

  expect(search).toHaveBeenCalledTimes(1);
});

test('unmounting aborts pending flight and metadata requests', async () => {
  const pending = deferred();
  search.mockReturnValue(pending.promise);

  const view = render(<FlightsComponent city="Paris" />);

  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));

  const signals = get.mock.calls.map(([, config]) => config.signal);

  view.unmount();

  expect(signals.every(signal => signal.aborted)).toBe(true);

  await act(async () => pending.resolve({ data: [flight()] }));
});
