import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  fireEvent.error(await screen.findByRole('img', { name: 'Temple' }));

  expect(
    screen.queryByRole('img', { name: 'Temple' })
  ).not.toBeInTheDocument();

  expect(screen.getByText('Photo unavailable')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Temple' })).toBeInTheDocument();
});

test('ignores a previous city response arriving late', async () => {
  let resolveParis: (value: unknown) => void = () => {};

  get.mockImplementationOnce(
    () => new Promise(resolve => {
      resolveParis = resolve;
    })
  );

  const { rerender } = render(
    <AttractionComponent
      city="Paris"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  const previousSignal = get.mock.calls[0][1].signal as AbortSignal;

  get.mockResolvedValueOnce({ data: [place] });

  rerender(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await screen.findByRole('button', { name: 'Temple' });

  expect(previousSignal.aborted).toBe(true);

  await act(async () =>
    resolveParis({
      data: [{ id: 2, name: 'Old Paris result' }],
    })
  );

  expect(screen.queryByText('Old Paris result')).not.toBeInTheDocument();

  expect(
    screen.getByRole('button', { name: 'Temple' })
  ).toBeInTheDocument();
});

test('distinguishes failure from an empty result and permits manual retry', async () => {
  get.mockRejectedValueOnce(new Error('Provider failed'))
    .mockResolvedValueOnce({ data: [] });

  render(
    <AttractionComponent
      city="Paris"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await screen.findByRole('alert');

  expect(
    screen.queryByText('No attractions found for this city.')
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  await screen.findByText('No attractions found for this city.');

  expect(get).toHaveBeenCalledTimes(2);
});

test('exposes accessible details and rejects unsafe website links', async () => {
  // eslint-disable-next-line no-script-url -- Deliberately invalid provider URL for a rejection test.
  get.mockResolvedValue({ data: [{ ...place, website: 'javascript:alert(1)', address: 'Temple street' }] });

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  const button = await screen.findByRole('button', { name: 'Temple' });

  expect(button).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(button);

  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Temple street')).toBeVisible();

  expect(
    screen.queryByRole('link', { name: 'Visit official website' })
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('Photo credits'));

  await waitFor(() =>
    expect(
      screen.getByRole('link', { name: /Photographer/ })
    ).toBeVisible()
  );
});

test('rejects lookalike Wikimedia image hosts', async () => {
  get.mockResolvedValue({
    data: [{
      ...place,
      imageUrl: 'https://thumb.wikimedia.org.evil.test/Temple.jpg',
    }],
  });

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await screen.findByRole('button', { name: 'Temple' });

  expect(
    screen.queryByRole('img', { name: 'Temple' })
  ).not.toBeInTheDocument();
});

test('image and title toggle the same accessible details', async () => {
  get.mockResolvedValue({
    data: [{ ...place, address: 'Temple street' }],
  });

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

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
  const artist =
    'Photographer with a deliberately long attribution including several contributors';

  get.mockResolvedValue({
    data: [{ ...place, imageAttribution: artist }],
  });

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await screen.findByRole('button', { name: 'Temple' });

  expect(screen.getByText(new RegExp(artist))).not.toBeVisible();

  fireEvent.click(screen.getByText('Photo credits'));

  const credit = screen.getByRole('link', {
    name: new RegExp(artist),
  });

  expect(credit).toBeVisible();
  expect(credit).toHaveAttribute('href', place.imagePageUrl);

  expect(
    screen.getByRole('button', { name: 'Temple' })
  ).toHaveAttribute('aria-expanded', 'false');
});

test('keeps a usable details button when no photo is available', async () => {
  get.mockResolvedValue({
    data: [{
      ...place,
      imageUrl: undefined,
      address: 'Temple street',
    }],
  });

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  const button = await screen.findByRole('button', {
    name: 'Show details for Temple',
  });

  expect(screen.getByText('Photo unavailable')).toBeVisible();

  expect(
    screen.queryByRole('img', { name: 'Temple' })
  ).not.toBeInTheDocument();

  expect(screen.queryByText('Photo credits')).not.toBeInTheDocument();

  fireEvent.click(button);

  expect(screen.getByText('Temple street')).toBeVisible();
  expect(button).toHaveAttribute('aria-expanded', 'true');
});

test('map searches preserve the attraction identity even when coordinates exist', async () => {
  get.mockResolvedValue({
    data: [{ ...place, latitude: 35.7, longitude: 139.7 }],
  });

  const onMap = jest.fn();

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={onMap}
    />
  );

  fireEvent.click(
    await screen.findByRole('button', { name: 'Show on Map' })
  );

  expect(onMap).toHaveBeenCalledWith('Temple, Tokyo');
});

test('map searches include the address, city and country to distinguish places', async () => {
  get.mockResolvedValue({
    data: [{
      ...place,
      name: ' Museum ',
      address: ' Main Street 2 ',
      country: 'Japan',
    }],
  });

  const onMap = jest.fn();

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={onMap}
    />
  );

  fireEvent.click(
    await screen.findByRole('button', { name: 'Show on Map' })
  );

  expect(onMap).toHaveBeenCalledWith(
    'Museum, Main Street 2, Tokyo, Japan'
  );
});

test('unnamed attractions can still use valid coordinates', async () => {
  get.mockResolvedValue({
    data: [{ ...place, name: '', latitude: 0, longitude: 30 }],
  });

  const onMap = jest.fn();

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={onMap}
    />
  );

  fireEvent.click(
    await screen.findByRole('button', { name: 'Show on Map' })
  );

  expect(onMap).toHaveBeenCalledWith('0,30');
});

test('an unnamed attraction with invalid coordinates falls back to the city', async () => {
  get.mockResolvedValue({
    data: [{ ...place, name: '', latitude: 91, longitude: 181 }],
  });

  const onMap = jest.fn();

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={onMap}
    />
  );

  fireEvent.click(
    await screen.findByRole('button', { name: 'Show on Map' })
  );

  expect(onMap).toHaveBeenCalledWith('Tokyo');
});

test('Strict Mode dispatches one bounded request', async () => {
  get.mockResolvedValue({ data: [place] });

  render(
    <React.StrictMode>
      <AttractionComponent
        city="Tokyo"
        onShowAttractionOnMap={jest.fn()}
      />
    </React.StrictMode>
  );

  await screen.findByRole('button', { name: 'Temple' });

  expect(get).toHaveBeenCalledTimes(1);

  expect(get.mock.calls[0][1]).toEqual({
    params: { city: 'Tokyo' },
    signal: expect.any(AbortSignal),
    timeout: 125000,
  });
});

test.each([
  null,
  { places: [] },
  [null],
  [[]],
  [{}],
  [{ ...place, name: 42 }],
  [{ ...place, description: { text: 'Bad data' } }],
  [{ ...place, address: ['Wrong type'] }],
  [{ ...place, latitude: '35.7' }],
  [place, { ...place, imageAttribution: {} }],
].map(data => ({ data })))(
  'rejects malformed attractions response %#',
  async ({ data }) => {
    get.mockResolvedValue({ data });

    render(
      <AttractionComponent
        city="Tokyo"
        onShowAttractionOnMap={jest.fn()}
      />
    );

    await screen.findByRole('alert');

    expect(
      screen.queryByText('No attractions found for this city.')
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Temple' })
    ).not.toBeInTheDocument();
  }
);

test('accepts nullable optional fields and preserves cards', async () => {
  get.mockResolvedValue({
    data: [{
      ...place,
      imageUrl: null,
      latitude: null,
      address: null,
      description: null,
    }],
  });

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await screen.findByRole('button', { name: 'Temple' });

  expect(screen.getByText('Photo unavailable')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('timeout ends loading and only a manual retry dispatches another request', async () => {
  get.mockRejectedValueOnce(
    Object.assign(new Error('timeout'), { code: 'ECONNABORTED' })
  ).mockResolvedValueOnce({ data: [place] });

  render(
    <AttractionComponent
      city="Tokyo"
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await screen.findByRole('alert');

  expect(
    screen.getByRole('region', { name: 'Attractions in Tokyo' })
  ).toHaveAttribute('aria-busy', 'false');

  expect(get).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  await screen.findByRole('button', { name: 'Temple' });

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(get).toHaveBeenCalledTimes(2);
});

test('does not send a request when city is empty', async () => {
  render(
    <AttractionComponent
      city=""
      onShowAttractionOnMap={jest.fn()}
    />
  );

  await act(async () => {
    await Promise.resolve();
  });

  expect(get).not.toHaveBeenCalled();

  expect(
    screen.queryByText('No attractions found for this city.')
  ).not.toBeInTheDocument();
});