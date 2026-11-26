import React from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import CityPhoto, { findCityPhoto } from './CityPhoto';
import catalog from './cityPhotoCatalog.json';

const remote = 'https://example.com/photo.jpg';

const london = {
  name: 'London',
  country: 'UK',
  address: 'London, UK',
  icon: remote,
  photoAttributions: ['Provider photographer'],
};

test.each(catalog)(
  'matches the catalog entry for $key',
  entry => {
    expect(
      findCityPhoto({
        name: entry.cities[0],
        country: entry.countries[0],
      })?.key
    ).toBe(entry.key);
  }
);

test('uses country and normalized city names to disambiguate', () => {
  expect(
    findCityPhoto({
      name: 'London',
      country: 'Canada',
    })
  ).toBeUndefined();

  expect(
    findCityPhoto({ name: 'Paris' })
  ).toBeUndefined();

  expect(
    findCityPhoto({
      name: 'Reykjavík',
      country: 'Iceland',
    })?.key
  ).toBe('reykjavik');

  expect(
    findCityPhoto({
      name: 'New York',
      address: 'New York, NY, USA',
    })?.key
  ).toBe('new-york');
});

test('prefers the local photo and credits its actual author and license', () => {
  render(<CityPhoto place={london} />);

  const image = screen.getByRole('img', {
    name: /Big Ben/,
  });

  expect(image).toHaveAttribute(
    'src',
    expect.stringContaining('/city-images/london.webp')
  );

  expect(
    screen.queryByText('Provider photographer')
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('Photo credits'));

  expect(
    screen.getByRole('link', { name: 'Domob' })
  ).toHaveAttribute(
    'href',
    'https://commons.wikimedia.org/wiki/File:Palace_of_Westminster_and_Elizabeth_Tower_20250522.jpg'
  );

  expect(
    screen.getByRole('link', { name: 'CC BY-SA 4.0' })
  ).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by-sa/4.0'
  );
});

test('falls back to the provider photo and credits, then to the background', () => {
  render(<CityPhoto place={london} />);

  fireEvent.error(screen.getByRole('img'));

  expect(screen.getByRole('img')).toHaveAttribute(
    'src',
    remote
  );

  expect(
    screen.getByText('Provider photographer')
  ).toBeInTheDocument();

  expect(
    screen.queryByText('Domob')
  ).not.toBeInTheDocument();

  fireEvent.error(screen.getByRole('img'));

  expect(
    screen.queryByRole('img')
  ).not.toBeInTheDocument();

  expect(
    screen.queryByText('Provider photographer')
  ).not.toBeInTheDocument();

  expect(
    screen.getByText('London, UK')
  ).toBeInTheDocument();
});

test('uses the existing provider photo for destinations outside the catalog', () => {
  render(
    <CityPhoto
      place={{
        ...london,
        name: 'London',
        country: 'Canada',
      }}
    />
  );

  expect(screen.getByRole('img')).toHaveAttribute(
    'src',
    remote
  );
});

test('keeps the city label when no usable photo exists', () => {
  render(
    <CityPhoto
      place={{
        name: 'Unknown city',
        icon: 'javascript:invalid',
      }}
    />
  );

  expect(
    screen.queryByRole('img')
  ).not.toBeInTheDocument();

  expect(
    screen.getByText('Unknown city')
  ).toBeInTheDocument();
});