import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import axios from 'axios';
import HotelComponent from './HotelComponent';

jest.mock('axios', () => ({ get: jest.fn() }));

const get = axios.get as jest.Mock;

afterEach(() => {
  jest.restoreAllMocks();
  get.mockReset();
});

test('mock hotels disclose their simulated fields and search the destination', async () => {
  get.mockResolvedValue({
    data: [{
      hotelId: 'MOCK_1',
      name: 'Demo Paris Hotel',
      price: 120,
      rating: 8.2,
      imageUrl: 'https://example.com/mock.jpg',
      latitude: 48.8,
      longitude: 2.3
    }]
  });

  const open = jest.spyOn(window, 'open')
    .mockImplementation(() => null);

  const onMap = jest.fn();

  render(
    <HotelComponent
      cityName="Paris"
      countryName="France"
      onShowHotelOnMap={onMap}
    />
  );

  expect(await screen.findByRole('note'))
    .toHaveTextContent('Illustrative');

  expect(get.mock.calls[0][1].params.cityName)
    .toBe('Paris, France');

  expect(
    screen.getByRole('img', {
      name: 'AI-generated illustrative hotel'
    })
  ).toHaveAttribute(
    'src',
    '/hotel-demo-images/hotel-0.webp'
  );

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Show City on Map'
    })
  );

  expect(onMap).toHaveBeenCalledWith('Paris, France');

  expect(screen.getByLabelText('Demo rating: 8.2'))
    .toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Details for Demo Paris Hotel'
    })
  );

  expect(screen.getByText('Demo total:'))
    .toBeInTheDocument();

  expect(screen.queryByText(/Inc. Tax/))
    .not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Search on Booking.com'
    })
  );

  const url = new URL(open.mock.calls[0][0] as string);

  expect(url.searchParams.get('ss')).toBe('Paris, France');
  expect(url.searchParams.get('group_adults')).toBe('1');
  expect(url.searchParams.get('checkin'))
    .toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

const catalogHotel = {
  hotelId: 'CATALOG_Q1',
  name: 'Hôtel de Paris',
  price: 120,
  rating: 9,
  latitude: 48.81,
  longitude: 2.31,
  imageUrl: '/hotel-images/Q1.webp',
  photoAttribution: {
    title: 'File:Hotel.jpg',
    author: 'Example photographer',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hotel.jpg',
    modifications: 'Resized and converted to WebP'
  }
};

test('mock results are limited to ten distinct local illustrations', async () => {
  get.mockResolvedValue({
    data: Array.from({ length: 25 }, (_, i) => ({
      hotelId: `MOCK_${i}`,
      name: `Demo Hotel ${i}`,
      price: 100
    }))
  });

  render(
    <HotelComponent
      cityName="Paris"
      countryName="France"
      onShowHotelOnMap={jest.fn()}
    />
  );

  expect(
    screen.getByRole('status', {
      name: 'Loading hotels'
    })
  ).toBeInTheDocument();

  await waitFor(() =>
    expect(screen.getAllByRole('img')).toHaveLength(10)
  );

  expect(
    new Set(
      screen.getAllByRole('img')
        .map(image => image.getAttribute('src'))
    ).size
  ).toBe(10);
});

test('catalog hotels preserve their name and never display a simulated rating', async () => {
  get.mockResolvedValue({
    data: [catalogHotel]
  });

  const open = jest.spyOn(window, 'open')
    .mockImplementation(() => null);

  const onMap = jest.fn();

  render(
    <HotelComponent
      cityName="Paris, Ile-de-France, France"
      countryName="France"
      onShowHotelOnMap={onMap}
    />
  );

  expect(
    await screen.findByRole('heading', {
      name: 'Hôtel de Paris'
    })
  ).toBeInTheDocument();

  expect(get.mock.calls[0][1].params.cityName)
    .toBe('Paris, Ile-de-France, France');

  expect(screen.getByRole('note'))
    .toHaveTextContent('No live availability');

  expect(screen.queryByLabelText(/Demo rating/))
    .not.toBeInTheDocument();

  expect(
    screen.getByRole('img', {
      name: 'Hôtel de Paris'
    })
  ).toHaveAttribute('src', '/hotel-images/Q1.webp');

  fireEvent.click(screen.getByText('Photo credits'));

  expect(
    screen.getByRole('link', {
      name: 'Example photographer'
    })
  ).toHaveAttribute(
    'href',
    catalogHotel.photoAttribution.sourceUrl
  );

  expect(
    screen.getByRole('link', {
      name: 'CC BY-SA 4.0'
    })
  ).toHaveAttribute(
    'href',
    catalogHotel.photoAttribution.licenseUrl
  );

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Show on Map'
    })
  );

  expect(onMap).toHaveBeenCalledWith(
    'Hôtel de Paris, Paris, Ile-de-France, France'
  );

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Details for Hôtel de Paris'
    })
  );

  fireEvent.click(
    screen.getByRole('button', {
      name: 'Search on Booking.com'
    })
  );

  expect(
    new URL(open.mock.calls[0][0] as string)
      .searchParams.get('ss')
  ).toBe('Hôtel de Paris Paris, Ile-de-France, France');
});

test('an unavailable catalog image uses an honest local placeholder', async () => {
  get.mockResolvedValue({
    data: [catalogHotel]
  });

  render(
    <HotelComponent
      cityName="Paris, France"
      countryName="France"
      onShowHotelOnMap={jest.fn()}
    />
  );

  fireEvent.error(
    await screen.findByRole('img', {
      name: 'Hôtel de Paris'
    })
  );

  expect(screen.getByText('Photo unavailable'))
    .toBeInTheDocument();

  expect(screen.queryByRole('img'))
    .not.toBeInTheDocument();
});

test('a mismatched local image does not get displayed as the hotel photo', async () => {
  get.mockResolvedValue({
    data: [{
      ...catalogHotel,
      imageUrl: '/hotel-images/Q2.webp'
    }]
  });

  render(
    <HotelComponent
      cityName="Paris, France"
      countryName="France"
      onShowHotelOnMap={jest.fn()}
    />
  );

  expect(await screen.findByText('Photo unavailable'))
    .toBeInTheDocument();

  expect(screen.queryByRole('img'))
    .not.toBeInTheDocument();
});

test('untrusted attribution links cannot be rendered', async () => {
  get.mockResolvedValue({
    data: [{
      ...catalogHotel,
      photoAttribution: {
        ...catalogHotel.photoAttribution,
        sourceUrl:
          'https://commons.wikimedia.org.evil.example/wiki/File:Hotel.jpg'
      }
    }]
  });

  render(
    <HotelComponent
      cityName="Paris, France"
      countryName="France"
      onShowHotelOnMap={jest.fn()}
    />
  );

  expect(await screen.findByRole('alert'))
    .toHaveTextContent('Unable to load hotels');

  expect(screen.queryByRole('link'))
    .not.toBeInTheDocument();
});