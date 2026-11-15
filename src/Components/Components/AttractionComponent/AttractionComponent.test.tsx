import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import AttractionComponent from './AttractionComponent';

jest.mock('axios', () => ({ get: jest.fn() }));
const get = axios.get as jest.Mock;

const place = {
  id: 1,
  name: 'Temple',
  city: 'Tokyo',
  imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/a/a1/Temple.jpg',
  imagePageUrl: 'https://commons.wikimedia.org/wiki/File:Temple.jpg',
  imageAttribution: 'Photographer',
  imageLicense: 'CC BY-SA 4.0',
};

beforeEach(() => get.mockReset());

test('removes broken images while retaining the attraction', async () => {
  get.mockResolvedValue({ data: [place] });
  render(<AttractionComponent city="Tokyo" onShowAttractionOnMap={jest.fn()} />);

  fireEvent.error(await screen.findByRole('img', { name: 'Temple' }));

  expect(screen.queryByRole('img', { name: 'Temple' })).not.toBeInTheDocument();
  expect(screen.getByText('Photo unavailable')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Temple' })).toBeInTheDocument();
});

test('ignores a previous city response arriving late', async () => {
  let resolveParis: (value: unknown) => void = () => {};
  get.mockImplementationOnce(() => new Promise(resolve => {
    resolveParis = resolve;
  }));

  const { rerender } = render(
    <AttractionComponent city="Paris" onShowAttractionOnMap={jest.fn()} />
  );

  get.mockResolvedValueOnce({ data: [place] });
  rerender(<AttractionComponent city="Tokyo" onShowAttractionOnMap={jest.fn()} />);
  await screen.findByRole('button', { name: 'Temple' });

  await act(async () => resolveParis({
    data: [{ id: 2, name: 'Old Paris result' }],
  }));

  expect(screen.queryByText('Old Paris result')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Temple' })).toBeInTheDocument();
});

test('distinguishes failure from an empty result and permits manual retry', async () => {
  get.mockRejectedValueOnce(new Error('Provider failed'))
    .mockResolvedValueOnce({ data: [] });

  render(<AttractionComponent city="Paris" onShowAttractionOnMap={jest.fn()} />);
  await screen.findByRole('alert');

  expect(screen.queryByText('No attractions found for this city.'))
    .not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('No attractions found for this city.');

  expect(get).toHaveBeenCalledTimes(2);
});

test('exposes accessible details and rejects unsafe website links', async () => {
  get.mockResolvedValue({
    data: [{
      ...place,
      website: 'javascript:alert(1)',
      address: 'Temple street',
    }],
  });

  render(<AttractionComponent city="Tokyo" onShowAttractionOnMap={jest.fn()} />);
  const button = await screen.findByRole('button', { name: 'Temple' });

  expect(button).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Temple street')).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Visit official website' }))
    .not.toBeInTheDocument();

  fireEvent.click(screen.getByText('Photo credits'));
  await waitFor(() => expect(screen.getByRole('link', { name: /Photographer/ }))
    .toBeVisible());
});

test('rejects lookalike Wikimedia image hosts', async () => {
  get.mockResolvedValue({
    data: [{
      ...place,
      imageUrl: 'https://thumb.wikimedia.org.evil.test/Temple.jpg',
    }],
  });

  render(<AttractionComponent city="Tokyo" onShowAttractionOnMap={jest.fn()} />);
  await screen.findByRole('button', { name: 'Temple' });

  expect(screen.queryByRole('img', { name: 'Temple' })).not.toBeInTheDocument();
});

test('image and title toggle the same accessible details', async () => {
  get.mockResolvedValue({ data: [{ ...place, address: 'Temple street' }] });
  render(<AttractionComponent city="Tokyo" onShowAttractionOnMap={jest.fn()} />);

  const imageButton = await screen.findByRole('button', {
    name: 'Show details for Temple',
  });
  const titleButton = screen.getByRole('button', { name: 'Temple' });

  expect(imageButton).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(imageButton);

  expect(imageButton).toHaveAttribute('aria-expanded', 'true');
  expect(titleButton).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Temple street')).toBeVisible();

  fireEvent.click(titleButton);

  expect(imageButton).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByText('Temple street')).not.toBeVisible();
});

test('reveals full photo credits independently of attraction details', async () => {
  const artist = 'Photographer with a deliberately long attribution including several contributors';
  get.mockResolvedValue({ data: [{ ...place, imageAttribution: artist }] });

  render(<AttractionComponent city="Tokyo" onShowAttractionOnMap={jest.fn()} />);
  await screen.findByRole('button', { name: 'Temple' });

  expect(screen.getByText(new RegExp(artist))).not.toBeVisible();

  fireEvent.click(screen.getByText('Photo credits'));

  const credit = screen.getByRole('link', { name: new RegExp(artist) });
  expect(credit).toBeVisible();
  expect(credit).toHaveAttribute('href', place.imagePageUrl);
  expect(screen.getByRole('button', { name: 'Temple' }))
    .toHaveAttribute('aria-expanded', 'false');
});

test('keeps a usable details button when no photo is available', async () => {
  get.mockResolvedValue({
    data: [{
      ...place,
      imageUrl: undefined,
      address: 'Temple street',
    }],
  });

  render(<AttractionComponent city="Tokyo" onShowAttractionOnMap={jest.fn()} />);
  const button = await screen.findByRole('button', {
    name: 'Show details for Temple',
  });

  expect(screen.getByText('Photo unavailable')).toBeVisible();
  expect(screen.queryByRole('img', { name: 'Temple' })).not.toBeInTheDocument();
  expect(screen.queryByText('Photo credits')).not.toBeInTheDocument();

  fireEvent.click(button);

  expect(screen.getByText('Temple street')).toBeVisible();
  expect(button).toHaveAttribute('aria-expanded', 'true');
});