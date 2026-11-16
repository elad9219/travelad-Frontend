import React from 'react';
import { render, screen } from '@testing-library/react';
import { useParams as mockUseParams } from 'react-router-dom';
import App from './App';

jest.mock('./Components/PlaceDetails/PlaceDetails/PlaceDetails', () => ({
  __esModule: true,
  default: function RouteProbe() {
    const { cityName } = mockUseParams();
    return <h1>{cityName || 'Travelad home'}</h1>;
  },
}));

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

test('routes the homepage to the place search screen', () => {
  window.history.replaceState({}, '', '/');

  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Travelad home' })
  ).toBeInTheDocument();
});

test('routes an encoded city URL to the place details screen', () => {
  window.history.replaceState({}, '', '/New%20York');

  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'New York' })
  ).toBeInTheDocument();
});