import React from 'react';
import { render, screen } from '@testing-library/react';
import MapComponent from './MapComponent';

function mapUrl() {
  return new URL(screen.getByTitle('Google Map').getAttribute('src')!);
}

test.each(['New York', 'A+B%20C', '東京', 'Eiffel Tower, Paris'])(
  'encodes place queries exactly once: %s', query => {
    render(<MapComponent query={query} />);
    const url = mapUrl();
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/embed/v1/place');
    expect(url.searchParams.get('q')).toBe(query);
  }
);

test.each([{ lat: 0, lng: 0 }, { lat: 51.5, lng: -0.12 }, { lat: 90, lng: 180 }])(
  'uses the center parameter for valid coordinate props: %j', ({ lat, lng }) => {
    render(<MapComponent lat={lat} lng={lng} />);
    const url = mapUrl();
    expect(url.pathname).toBe('/maps/embed/v1/view');
    expect(url.searchParams.get('center')).toBe(`${lat},${lng}`);
    expect(url.searchParams.get('zoom')).toBe('12');
    expect(Array.from(url.searchParams.keys()).sort()).toEqual(['center', 'key', 'zoom']);
  }
);

test.each([
  { lat: undefined, lng: 0 }, { lat: NaN, lng: 0 },
  { lat: 0, lng: Infinity }, { lat: 91, lng: 0 }, { lat: 0, lng: -181 },
])('invalid coordinates do not load an iframe: %j', ({ lat, lng }) => {
  render(<MapComponent lat={lat} lng={lng} />);
  expect(screen.queryByTitle('Google Map')).not.toBeInTheDocument();
  expect(screen.getByText('No map available')).toBeInTheDocument();
});

test('invalid numeric coordinate queries do not become place searches', () => {
  render(<MapComponent query="91,181" />);
  expect(screen.queryByTitle('Google Map')).not.toBeInTheDocument();
});

test('accepts numeric queries containing a zero axis', () => {
  render(<MapComponent query="0,30" />);
  expect(mapUrl().searchParams.get('q')).toBe('0,30');
});

test('a blank query can fall back to valid coordinate props', () => {
  render(<MapComponent query=" " lat={51.5} lng={-0.12} />);
  expect(mapUrl().searchParams.get('center')).toBe('51.5,-0.12');
});

test('changing the selected location updates the iframe URL', () => {
  const view = render(<MapComponent query="Paris" />);
  view.rerender(<MapComponent query="Tokyo" />);
  expect(mapUrl().searchParams.get('q')).toBe('Tokyo');
  expect(screen.getByTitle('Google Map')).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
});

test('no location shows an unavailable state without an empty iframe request', () => {
  render(<MapComponent />);
  expect(screen.queryByTitle('Google Map')).not.toBeInTheDocument();
  expect(screen.getByText('No map available')).toBeInTheDocument();
});