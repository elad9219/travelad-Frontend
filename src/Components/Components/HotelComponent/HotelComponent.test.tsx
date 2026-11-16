import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  get.mockResolvedValue({ data: [hotel] });
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
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
  const serializedUrl = realAxios.getUri({
    url,
    params: config.params,
  });

  return new URL(serializedUrl).searchParams.get('cityName');
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

  fireEvent.click(
    screen.getByRole('button', { name: 'Advanced Search' })
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Search', exact: true })
  );

  await screen.findByRole('heading', { name: 'Example Hotel' });

  expect(get).toHaveBeenCalledTimes(2);
  expect(citySentOverTheWire(1)).toBe('New York');
});

test('details and map fallback do not decode literal percent sequences', async () => {
  const onMap = jest.fn();
  show('A+B%20C', onMap);

  const heading = await screen.findByRole('heading', {
    name: 'Example Hotel',
  });

  fireEvent.click(heading);

  expect(screen.getByText('A+B%20C')).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', { name: 'Show on Map' })
  );

  expect(onMap).toHaveBeenCalledWith('Example Hotel, A+B%20C');
});

test('the external search link encodes the original city once', async () => {
  const open = jest
    .spyOn(window, 'open')
    .mockImplementation(() => null);

  show('A+B%20C');

  fireEvent.click(
    await screen.findByRole('heading', { name: 'Example Hotel' })
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Book on Booking.com' })
  );

  const url = new URL(open.mock.calls[0][0] as string);

  expect(url.searchParams.get('ss')).toBe(
    'Example Hotel A+B%20C'
  );
});