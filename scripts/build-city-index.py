import argparse
import gzip
import json
import unicodedata
from collections import defaultdict
from pathlib import Path


SHARD_COUNT = 256
SUGGESTION_LIMIT = 8


def normalize(value):
    decomposed = unicodedata.normalize("NFD", value)
    plain = "".join(
        c for c in decomposed
        if not unicodedata.category(c).startswith("M")
    )
    return " ".join(plain.lower().split())


def shard_number(prefix):
    result = 0
    for character in prefix:
        result = (result * 31 + ord(character)) % SHARD_COUNT
    return result


def write_json(path, value):
    data = json.dumps(
        value, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    temporary = path.with_suffix(".tmp")
    temporary.write_bytes(data)
    temporary.replace(path)
    return len(data), len(gzip.compress(data))


def build(catalog_path, output):
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    columns = [
        "id", "name", "asciiName", "countryCode", "regionCode",
        "population", "latitude", "longitude", "featureCode", "aliases",
    ]
    if catalog["columns"] != columns:
        raise ValueError("Unexpected catalog columns")

    short_prefixes = defaultdict(list)
    shards = [defaultdict(list) for _ in range(SHARD_COUNT)]

    for row in catalog["cities"]:
        city_id, name, ascii_name, country, region, population, lat, lon, feature, aliases = row

        names = sorted({
            normalize(value)
            for value in [name, ascii_name, *aliases]
            if value
        })
        names = [value for value in names if value]

        if not names:
            raise ValueError(f"City has no search names: {city_id}")

        entry = [
            city_id,
            name,
            country,
            catalog["regions"].get(f"{country}.{region}", ""),
            population,
            lat,
            lon,
            names,
        ]

        for prefix in {
            value[:length]
            for value in names
            for length in (1, 2)
            if len(value) >= length
        }:
            short_prefixes[prefix].append(entry)

        for prefix in {
            value[:3] for value in names if len(value) >= 3
        }:
            shards[shard_number(prefix)][prefix].append(entry)

    for prefix, entries in short_prefixes.items():
        entries.sort(key=lambda entry: (-entry[4], entry[0]))

        selected = []
        seen = set()

        for entry in entries:
            parts = {}

            for value in (
                entry[1],
                entry[3],
                catalog["countries"][entry[2]],
            ):
                if value:
                    parts.setdefault(normalize(value), value)

            if len(", ".join(parts.values()).encode("utf-16-le")) // 2 > 120:
                continue

            label = ", ".join(parts)

            if label in seen:
                continue

            seen.add(label)
            selected.append(entry)

            if len(selected) == SUGGESTION_LIMIT:
                break

        short_prefixes[prefix] = selected

    for shard in shards:
        for entries in shard.values():
            entries.sort(
                key=lambda entry: (-entry[4], entry[1], entry[0])
            )

    output.mkdir(parents=True, exist_ok=True)

    sizes = [
        write_json(output / "short-prefixes.json", short_prefixes)
    ]

    for number, shard in enumerate(shards):
        sizes.append(
            write_json(output / f"shard-{number}.json", shard)
        )

    sizes.append(write_json(output / "metadata.json", {
        "source": catalog["source"],
        "license": catalog["license"],
        "modifications": (
            catalog["modifications"]
            + " Normalized search names and indexed prefixes."
        ),
        "inputs": catalog["inputs"],
        "columns": [
            "id", "name", "countryCode", "region", "population",
            "latitude", "longitude", "searchNames",
        ],
        "countries": catalog["countries"],
        "shardCount": SHARD_COUNT,
        "prefixLength": 3,
    }))

    print(f"Indexed cities: {len(catalog['cities']):,}")
    print(f"Files: {len(sizes)}")
    print(f"Total JSON bytes: {sum(size[0] for size in sizes):,}")
    print(f"Largest shard gzip bytes: {max(size[1] for size in sizes[1:-1]):,}")
    print(f"Short suggestions gzip bytes: {sizes[0][1]:,}")
    print(f"Output: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build on-demand city search indexes."
    )
    parser.add_argument("catalog", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    build(args.catalog, args.output)