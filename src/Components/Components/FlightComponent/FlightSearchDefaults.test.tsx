import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import FlightsComponent from './FlightComponent';
import globals from '../../../utils/globals';

jest.mock('axios', () => ({ get: jest.fn() }));

const get = axios.get as jest.Mock;

const requests = (url: string) =>
  get.mock.calls.filter(([path]) => path === url);

const openAdvanced = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Advanced Search' })
  );

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: [] });
});

test('advanced defaults match the regular request, including a qualified city', async () => {
  render(<FlightsComponent city="Paris, France" />);

  await waitFor(() =>
    expect(requests(globals.api.flights)).toHaveLength(1)
  );

  openAdvanced();

  const params = requests(globals.api.flights)[0][1].params;

  expect(screen.getByLabelText('Origin:')).toHaveValue('Tel Aviv');
  expect(screen.getByLabelText('Destination:')).toHaveValue('Paris, France');

  expect(screen.getByLabelText('Depart Date:')).toHaveValue(
    params.departureDate
  );

  expect(screen.getByLabelText('Return Date:')).toHaveValue(
    params.returnDate
  );

  expect(screen.getByLabelText('Adults:')).toHaveValue(1);

  expect(
    screen.getByRole('radio', { name: 'Round Trip' })
  ).toBeChecked();

  expect(requests(globals.api.advancedFlights)).toHaveLength(0);

  fireEvent.click(
    screen.getByRole('button', { name: 'Search', exact: true })
  );

  await waitFor(() =>
    expect(requests(globals.api.advancedFlights)).toHaveLength(1)
  );

  expect(requests(globals.api.advancedFlights)[0][1].params).toEqual({
    origin: 'Tel Aviv',
    destination: params.city,
    departDate: params.departureDate,
    returnDate: params.returnDate,
    adults: '1',
  });
});

test('closing the form preserves edits, and changing city resets them', async () => {
  const view = render(<FlightsComponent city="Paris" />);

  await waitFor(() =>
    expect(requests(globals.api.flights)).toHaveLength(1)
  );

  openAdvanced();

  fireEvent.change(screen.getByLabelText('Destination:'), {
    target: { value: 'London' },
  });

  fireEvent.click(
    screen.getByRole('radio', { name: 'One-Way' })
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Advanced Search' })
  );

  openAdvanced();

  expect(screen.getByLabelText('Destination:')).toHaveValue('London');

  expect(
    screen.getByRole('radio', { name: 'One-Way' })
  ).toBeChecked();

  expect(
    screen.queryByLabelText('Return Date:')
  ).not.toBeInTheDocument();

  view.rerender(<FlightsComponent city="Tokyo" />);

  await waitFor(() =>
    expect(requests(globals.api.flights)).toHaveLength(2)
  );

  openAdvanced();

  expect(screen.getByLabelText('Destination:')).toHaveValue('Tokyo');

  expect(
    screen.getByRole('radio', { name: 'Round Trip' })
  ).toBeChecked();

  expect(screen.getByLabelText('Return Date:')).toHaveValue(
    requests(globals.api.flights)[1][1].params.returnDate
  );

  expect(requests(globals.api.advancedFlights)).toHaveLength(0);
});