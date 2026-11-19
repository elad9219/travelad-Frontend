import fs from 'fs';
import path from 'path';
import { getCitySuggestions } from './citySuggestions';

test('loads only the relevant files and ranks exact matches and aliases', async () => {
  const original = global.fetch;

  const mockFetch = jest.fn(async (url: string) => {
    const filename = url.split('/').pop()!;
    const file = path.join(
      process.cwd(),
      'public/data/cities-v1',
      filename
    );

    return {
      ok: true,
      json: async () => JSON.parse(fs.readFileSync(file, 'utf8')),
    };
  });

  global.fetch = mockFetch as any;

  try {
    expect(await getCitySuggestions('')).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();

    const paris = await getCitySuggestions('Paris');

    expect(paris[0]).toBe('Paris, Ile-de-France, France');
    expect(paris).toContain('Paris, Texas, United States');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    expect((await getCitySuggestions('Par'))[0]).toBe(
      'Paris, Ile-de-France, France'
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);

    expect((await getCitySuggestions('New York'))[0]).toBe(
      'New York City, New York, United States'
    );

    expect((await getCitySuggestions('Barcelona'))[0]).toBe(
      'Barcelona, Catalonia, Spain'
    );

    expect((await getCitySuggestions('São Paulo'))[0]).toBe(
      'São Paulo, Brazil'
    );

    expect(await getCitySuggestions('L')).toHaveLength(8);

    expect((await getCitySuggestions('pa'))[0]).toBe(
      'Paris, Ile-de-France, France'
    );

    expect((await getCitySuggestions('ro'))[0]).toBe(
      'Rome, Lazio, Italy'
    );

    expect((await getCitySuggestions('to'))[0]).toBe(
      'Tokyo, Japan'
    );

    expect(
      mockFetch.mock.calls.some(
        ([url]) => url.endsWith('/short-prefixes.json')
      )
    ).toBe(true);
  } finally {
    global.fetch = original;
  }
});