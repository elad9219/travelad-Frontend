import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import HotelComponent from './HotelComponent';

jest.mock('axios', () => ({ get: jest.fn() }));
const get = axios.get as jest.Mock;

afterEach(() => {
  get.mockReset();
  jest.restoreAllMocks();
});

test('price sorting preserves hotel identity and illustration assignment', async () => {
  get.mockResolvedValue({ data: [
    { hotelId: 'MOCK_1', name: 'Alpha', price: 200 },
    { hotelId: 'MOCK_2', name: 'Beta', price: 100 },
    { hotelId: 'MOCK_3', name: 'Gamma' }
  ] });
  render(<HotelComponent cityName="London" countryName="UK" onShowHotelOnMap={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Alpha' });
  const names = () => screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);
  expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'asc' } });
  expect(names()).toEqual(['Beta', 'Alpha', 'Gamma']);
  expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', '/hotel-demo-images/hotel-1.webp');
  fireEvent.click(screen.getAllByRole('button', { name: 'View details' })[0]);
  expect(screen.getByText('EUR 100.00')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'desc' } });
  expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  expect(screen.queryByText('Demo total:')).not.toBeInTheDocument();
});

test.each([
  { width: 1050, columns: 3, rowEnd: 3 },
  { width: 720, columns: 2, rowEnd: 2 },
  { width: 420, columns: 1, rowEnd: 2 },
])('details stay after the selected row at width $width', async ({ width, columns, rowEnd }) => {
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  get.mockResolvedValue({ data: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((name, index) => ({
    hotelId: `MOCK_${index}`, name, price: 100 + index,
  })) });
  render(<HotelComponent cityName="London" countryName="UK" onShowHotelOnMap={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Beta' });
  const buttons = screen.getAllByRole('button', { name: 'View details' });
  fireEvent.click(buttons[1]);
  const panel = screen.getByRole('region', { name: 'Hotel details for Beta' });
  // A direct grid-child check is intentional: DOM order determines row placement.
  // eslint-disable-next-line testing-library/no-node-access
  const grid = panel.parentElement!;
  expect(grid.style.gridTemplateColumns).toBe(`repeat(${columns}, minmax(0, 1fr))`);
  // eslint-disable-next-line testing-library/no-node-access
  expect(Array.from(grid.children).indexOf(panel)).toBe(rowEnd);
  expect(screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent))
    .toEqual(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']);
  expect(screen.getAllByRole('img')).toHaveLength(5);
  expect(panel).toHaveFocus();
  expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(panel).not.toBeInTheDocument();
  expect(buttons[1]).toHaveFocus();
  expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(buttons[4]);
  // eslint-disable-next-line testing-library/no-node-access
  expect(screen.getByRole('region', { name: 'Hotel details for Epsilon' })).toBe(grid.lastElementChild);
});