import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import axios from 'axios';
import FlightsComponent from './FlightComponent';
import globals from '../../../utils/globals';

jest.mock('axios', () => ({ get: jest.fn() }));

const get = axios.get as jest.Mock;

const offer = (departureDate: string, price = 100) => ({
  price,
  segments: [{
    origin: 'TLV',
    destination: 'LHR',
    departureDate,
    arrivalDate: '2027-03-14T07:25:00+00:00',
    duration: 'PT5H',
    carrierCode: 'LY',
    flightNumber: '100',
    aircraft: '789',
    aircraftFullName: 'Boeing 787-9',
  }],
});

const respond = (flights: unknown[], names: unknown[] = []) => {
  get.mockImplementation(url => Promise.resolve({
    data: url === globals.api.iataCodes ? names : flights,
  }));
};

beforeEach(() => jest.clearAllMocks());

test('airport names are readable in expanded details without hovering', async () => {
  respond([offer('2027-03-14T02:30:00')], [
    { 'AIRPORT CODE': 'TLV', 'FULL NAME': 'Ben Gurion International Airport' },
    { 'AIRPORT CODE': 'lhr', 'FULL NAME': 'London Heathrow Airport' },
  ]);

  render(<FlightsComponent city="London" />);

  const summary = await screen.findByRole('button', {
    name: 'Flight 1 details',
  });

  fireEvent.keyDown(summary, { key: 'Enter' });

  expect(await screen.findByText('Ben Gurion International Airport')).toBeVisible();
  expect(screen.getByText('London Heathrow Airport')).toBeVisible();
  expect(screen.getByText(/All times are local to the respective airport/)).toBeVisible();
  expect(screen.getByText(/02:30 14-03-2027/)).toBeVisible();
  expect(screen.getByText(/07:25 14-03-2027/)).toBeVisible();
});

test('earliest departure uses the airport clock even across a browser DST gap', async () => {
  respond([
    offer('2027-03-14T03:00:00', 100),
    offer('2027-03-14T02:30:00', 200),
  ]);

  render(<FlightsComponent city="London" />);

  await screen.findByText('€200.00');

  fireEvent.change(screen.getByLabelText('Sort by'), {
    target: { value: 'departure' },
  });

  const first = screen.getByRole('button', {
    name: 'Flight 1 details',
  });

  expect(within(first).getByText('€200.00')).toBeVisible();
  expect(within(first).getByText('02:30')).toBeVisible();
});

test('invalid calendar dates fail flight response validation', async () => {
  respond([offer('2027-02-30T12:00:00')]);

  render(<FlightsComponent city="London" />);

  expect(
    await screen.findByText('Unable to load flights. Please try again.')
  ).toBeVisible();

  expect(screen.queryByText('€100.00')).not.toBeInTheDocument();
});