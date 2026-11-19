import argparse
import gzip
import hashlib
import json
import unicodedata
import zipfile
from pathlib import Path


SOURCE_URL = "https://download.geonames.org/export/dump/"

ACTIVE_FEATURES = {
    "PPL", "PPLC", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLA5",
    "PPLX", "PPLL", "PPLF", "PPLG", "PPLR", "PPLS", "STLMT",
}

EXTRA_ALIASES = {
    5128581: ("New York",),
    293397: ("Tel Aviv Yafo", "Tel Aviv-Yafo"),
    2761369: ("Wien",),
    3067696: ("Praha",),
    3169070: ("Roma",),
    3530597: ("Ciudad de México",),
    1816670: ("Peking",),
}


def normalize(value):
    decomposed = unicodedata.normalize("NFD", value)
    plain = "".join(
        c for c in decomposed if not unicodedata.combining(c)
    )
    return " ".join(plain.casefold().split())


def read_table(path):
    with path.open(encoding="utf-8") as source:
        for line in source:
            if line.strip() and not line.startswith("#"):
                yield line.rstrip("\r\n").split("\t")


def generate(source, legacy_path, output):
    legacy = (
        json.loads(legacy_path.read_text(encoding="utf-8"))
        if legacy_path else []
    )

    legacy_names = {
        normalize(row["name"])
        for row in legacy
        if row["name"].strip()
    }

    countries = {
        row[0]: row[4]
        for row in read_table(source / "countryInfo.txt")
    }

    regions = {
        row[0]: row[2]
        for row in read_table(source / "admin1CodesASCII.txt")
    }

    cities = []
    seen_ids = set()
    search_names = set()

    with zipfile.ZipFile(source / "cities500.zip") as archive:
        with archive.open("cities500.txt") as records:
            for raw in records:
                row = raw.decode("utf-8").rstrip("\r\n").split("\t")

                if len(row) != 19:
                    raise ValueError("Unexpected GeoNames record format")

                if row[6] != "P" or row[7] not in ACTIVE_FEATURES:
                    continue

                city_id = int(row[0])
                name = row[1].strip()
                ascii_name = row[2].strip()
                country = row[8]

                if city_id in seen_ids or not name or country not in countries:
                    raise ValueError(f"Invalid or duplicate city: {city_id}")

                seen_ids.add(city_id)

                primary_names = {
                    normalize(name),
                    normalize(ascii_name),
                }

                extra_names = {
                    normalize(alias)
                    for alias in EXTRA_ALIASES.get(city_id, ())
                }

                source_aliases = {
                    normalize(alias)
                    for alias in row[3].split(",")
                }

                aliases = [
                    alias
                    for alias in EXTRA_ALIASES.get(city_id, ())
                    if normalize(alias) in source_aliases
                    and normalize(alias) not in primary_names
                ]

                if not extra_names.issubset(source_aliases | primary_names):
                    raise ValueError(
                        f"Expected aliases missing for {city_id}"
                    )

                search_names.update(primary_names)
                search_names.update(
                    normalize(alias) for alias in aliases
                )

                cities.append([
                    city_id,
                    name,
                    ascii_name if ascii_name != name else "",
                    country,
                    row[10],
                    int(row[14] or 0),
                    round(float(row[4]), 5),
                    round(float(row[5]), 5),
                    row[7],
                    sorted(aliases),
                ])

    if len(cities) < 100000 or len({row[3] for row in cities}) < 150:
        raise ValueError("Unexpectedly incomplete worldwide catalog")

    cities.sort(key=lambda row: row[0])

    catalog = {
        "source": "GeoNames (https://www.geonames.org/)",
        "license": "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)",
        "modifications": (
            "Filtered active populated places, "
            "selected aliases and rounded coordinates."
        ),
        "inputs": {
            name: hashlib.sha256((source / name).read_bytes()).hexdigest()
            for name in (
                "cities500.zip",
                "countryInfo.txt",
                "admin1CodesASCII.txt",
            )
        },
        "columns": [
            "id", "name", "asciiName", "countryCode", "regionCode",
            "population", "latitude", "longitude", "featureCode", "aliases",
        ],
        "countries": countries,
        "regions": regions,
        "cities": cities,
    }

    encoded = json.dumps(
        catalog, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")

    output.parent.mkdir(parents=True, exist_ok=True)

    temporary = output.with_suffix(".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(output)

    print(f"Cities: {len(cities):,}")
    print(f"Countries represented: {len({row[3] for row in cities})}")

    if legacy_path:
        print(
            f"Legacy names matched: "
            f"{len(legacy_names & search_names):,}/{len(legacy_names):,}"
        )

    print(f"JSON bytes: {len(encoded):,}")
    print(f"Gzip bytes: {len(gzip.compress(encoded)):,}")
    print(f"Output: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build the Travelad city catalog from GeoNames."
    )

    parser.add_argument("source", type=Path)
    parser.add_argument(
        "legacy",
        type=Path,
        nargs="?",
        help="Optional legacy catalog for coverage comparison",
    )
    parser.add_argument("output", type=Path)

    args = parser.parse_args()

    generate(args.source, args.legacy, args.output)