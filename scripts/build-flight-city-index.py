import argparse
import csv
import hashlib
import json
import math
import re
import unicodedata
from collections import defaultdict
from pathlib import Path


def normalize(value):
    value = unicodedata.normalize("NFD", value)
    plain = "".join(
        c for c in value
        if not unicodedata.category(c).startswith("M")
    )
    return " ".join(plain.lower().split())


def qualified_name(name, region, country):
    parts = []

    for part in (name, region, country):
        if part and normalize(part) not in {
            normalize(item) for item in parts
        }:
            parts.append(part)

    return ", ".join(parts)


def distance(lat, lon, row):
    phi1, phi2 = map(math.radians, (lat, row[6]))
    delta_phi = phi2 - phi1
    delta_lon = math.radians(row[7] - lon)

    angle = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1)
        * math.cos(phi2)
        * math.sin(delta_lon / 2) ** 2
    )

    return 6371 * 2 * math.asin(min(1, math.sqrt(angle)))


def build(catalog_path, legacy_path, airport_path, output):
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    legacy = json.loads(legacy_path.read_text(encoding="utf-8"))

    cities = {}
    by_name = defaultdict(set)
    by_query = defaultdict(set)

    for row in catalog["cities"]:
        city_id, name, ascii_name, country, region = row[:5]

        cities[city_id] = row

        region_name = catalog["regions"].get(
            f"{country}.{region}", ""
        )
        country_name = catalog["countries"][country]

        for value in {name, ascii_name, *row[9]} - {""}:
            by_name[(country, normalize(value))].add(city_id)

        for query in {
            qualified_name(name, region_name, country_name),
            qualified_name(name, "", country_name),
        }:
            by_query[normalize(query)].add(city_id)

    airports = defaultdict(list)

    with airport_path.open(encoding="utf-8", newline="") as source:
        for airport in csv.DictReader(source):
            if (
                re.fullmatch(r"[A-Z]{3}", airport["iata_code"])
                and airport["scheduled_service"] == "yes"
                and airport["type"] in {
                    "large_airport",
                    "medium_airport",
                    "small_airport",
                }
            ):
                airports[airport["iata_code"]].append(airport)

    codes = defaultdict(set)
    metro_codes = defaultdict(set)
    group_names = defaultdict(set)

    for entry in legacy:
        if entry["CITY CODE"] == entry["AIRPORT CODE"]:
            group_names[entry["CITY CODE"]].add(
                normalize(entry["FULL NAME"].split(",")[0])
            )

    for entry in legacy:
        airport_code = entry["AIRPORT CODE"]
        city_code = entry["CITY CODE"]
        actual = airports.get(airport_code, [])

        if len(actual) != 1 or not re.fullmatch(r"[A-Z]{3}", city_code):
            continue

        airport = actual[0]
        country = airport["iso_country"]

        names = {
            normalize(entry["FULL NAME"].split(",")[0])
        }

        if city_code != airport_code:
            names.update(group_names[city_code])

        candidates = set().union(*(
            by_name.get((country, name), set())
            for name in names
        ))

        if not candidates:
            continue

        lat = float(airport["latitude_deg"])
        lon = float(airport["longitude_deg"])

        nearby = sorted(
            (distance(lat, lon, cities[city_id]), city_id)
            for city_id in candidates
        )

        if nearby[0][0] > 100:
            continue

        # Decline assignments when nearby names cannot be
        # distinguished confidently.
        if (
            len(nearby) > 1
            and nearby[1][0] - nearby[0][0] < 10
        ):
            continue

        city_id = nearby[0][1]
        codes[city_id].add(city_code)

        if city_code != airport_code:
            metro_codes[city_id].add(city_code)

    resolved = {}

    for city_id, values in codes.items():
        preferred = metro_codes[city_id] or values

        if len(preferred) == 1:
            resolved[city_id] = next(iter(preferred))

    index = {
        query: resolved[next(iter(ids))]
        for query, ids in sorted(by_query.items())
        if len(ids) == 1 and next(iter(ids)) in resolved
    }

    if len(index) < 500:
        raise ValueError("Unexpectedly incomplete flight city index")

    result = {
        "sources": {
            "cities": catalog["source"],
            "cityLicense": catalog["license"],
            "airports": (
                "OurAirports (https://ourairports.com/data/), "
                "public domain"
            ),
            "airportSha256": hashlib.sha256(
                airport_path.read_bytes()
            ).hexdigest(),
            "legacySha256": hashlib.sha256(
                legacy_path.read_bytes()
            ).hexdigest(),
            "cityInputs": catalog["inputs"],
        },
        "codes": index,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".tmp")

    temporary.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            separators=(",", ":")
        ),
        encoding="utf-8"
    )

    temporary.replace(output)

    print(f"Matched cities: {len(resolved):,}")
    print(f"Qualified names: {len(index):,}")
    print(f"Output: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build qualified IATA lookup from verified airport locations."
    )

    parser.add_argument("catalog", type=Path)
    parser.add_argument("legacy", type=Path)
    parser.add_argument("airports", type=Path)
    parser.add_argument("output", type=Path)

    args = parser.parse_args()

    build(args.catalog, args.legacy, args.airports, args.output)