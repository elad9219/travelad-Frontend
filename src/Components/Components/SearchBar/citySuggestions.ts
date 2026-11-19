type CityEntry = [
  number, string, string, string, number, number, number, string[]
];

type Shard = Record<string, CityEntry[]>;

type Metadata = {
  countries: Record<string, string>;
  shardCount: number;
  prefixLength: number;
};

const base = `${process.env.PUBLIC_URL || ''}/data/cities-v1`;
const requests = new Map<string, Promise<unknown>>();
const combiningMarks = new RegExp('\\p{M}', 'gu');

export const normalizeCitySearch = (value: string) =>
  value.normalize('NFD')
    .replace(combiningMarks, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

function requestJson<T>(filename: string): Promise<T> {
  const cached = requests.get(filename);

  if (cached) {
    requests.delete(filename);
    requests.set(filename, cached);
    return cached as Promise<T>;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const request = fetch(`${base}/${filename}`, {
    signal: controller.signal,
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('City index unavailable');
      }

      return response.json();
    })
    .catch(error => {
      if (requests.get(filename) === request) {
        requests.delete(filename);
      }

      throw error;
    })
    .finally(() => clearTimeout(timeout));

  requests.set(filename, request);

  if (requests.size > 12) {
    const oldest = requests.keys().next().value;

    if (oldest !== undefined) {
      requests.delete(oldest);
    }
  }

  return request;
}

function qualifiedName(
  row: CityEntry,
  countries: Metadata['countries']
): string {
  const parts: string[] = [];

  for (const part of [row[1], row[3], countries[row[2]]]) {
    if (
      part &&
      !parts.some(
        value => normalizeCitySearch(value) === normalizeCitySearch(part)
      )
    ) {
      parts.push(part);
    }
  }

  return parts.join(', ');
}

export async function getCitySuggestions(value: string): Promise<string[]> {
  const query = normalizeCitySearch(value);

  if (!query || query.includes(',')) {
    return [];
  }

  const letters = Array.from(query);
  const prefix = letters.slice(0, 3).join('');

  const shard = letters.slice(0, 3).reduce(
    (number, letter) => (number * 31 + letter.codePointAt(0)!) % 256,
    0
  );

  const [metadata, index] = await Promise.all([
    requestJson<Metadata>('metadata.json'),
    requestJson<Shard>(
      letters.length < 3
        ? 'short-prefixes.json'
        : `shard-${shard}.json`
    ),
  ]);

  if (
    metadata.shardCount !== 256 ||
    metadata.prefixLength !== 3 ||
    !metadata.countries
  ) {
    throw new Error('Unexpected city index');
  }

  const rows = Object.prototype.hasOwnProperty.call(index, prefix)
    ? index[prefix]
    : [];

  const matches = rows.filter(row =>
    Array.isArray(row[7]) &&
    row[7].some(name => name.startsWith(query))
  ).sort((a, b) =>
    (
      letters.length >= 4
        ? Number(!a[7].includes(query)) -
          Number(!b[7].includes(query))
        : 0
    ) ||
    b[4] - a[4] ||
    a[0] - b[0]
  );

  const names = new Map<string, string>();

  for (const row of matches) {
    if (!metadata.countries[row[2]]) continue;

    const name = qualifiedName(row, metadata.countries);

    if (name.length > 120) continue;

    names.set(normalizeCitySearch(name), name);

    if (names.size >= 8) break;
  }

  return Array.from(names.values());
}