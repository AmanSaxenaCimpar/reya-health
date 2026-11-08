"""Back-office settings saved on the server. Not the old portal logins."""

import csv
import io
import json
import math
import os
import secrets
import urllib.parse
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data" / "portal.json"
_COORDS = {}

DEFAULTS = {
    "transport": {
        "base_fee": 40,
        "included_miles": 10,
        "per_mile": 2,
    },
    "service": {
        "base_zip": "60611",
        "transport_fee": 40,
    },
    "bands": [
        {"from_miles": 0, "to_miles": 10, "extra": 0},
        {"from_miles": 10, "to_miles": 25, "extra": 25},
        {"from_miles": 25, "to_miles": 50, "extra": 50},
    ],
    "offices": {
        "lab": {
            "base_zip": "60611",
            "transport_fee": 40,
            "bands": [
                {"from_miles": 0, "to_miles": 10, "extra": 0},
                {"from_miles": 10, "to_miles": 25, "extra": 25},
                {"from_miles": 25, "to_miles": 50, "extra": 50},
            ],
        },
        "imaging": {
            "base_zip": "60611",
            "transport_fee": 55,
            "bands": [
                {"from_miles": 0, "to_miles": 10, "extra": 0},
                {"from_miles": 10, "to_miles": 25, "extra": 25},
                {"from_miles": 25, "to_miles": 50, "extra": 50},
            ],
        },
    },
    "content": {},
    "question_edits": {"lab": {}, "imaging": {}},
    "prices": {},
    "custom_tests": [],
    "removed_codes": [],
    "businesses": [],
    "invites": [],
}

DEFAULT_BANDS = [
    {"from_miles": 0, "to_miles": 10, "extra": 0},
    {"from_miles": 10, "to_miles": 25, "extra": 25},
    {"from_miles": 25, "to_miles": 50, "extra": 50},
]


def _copy(value):
    return json.loads(json.dumps(value))


def seed_login(business_id: str):
    if business_id == "reya-lab":
        return (
            os.environ.get("LAB_OFFICE_EMAIL", "lab@reyahealth.com").strip().lower(),
            os.environ.get("LAB_OFFICE_PASSWORD", "LabOffice2026"),
        )
    if business_id == "reya-imaging":
        return (
            os.environ.get("IMAGING_OFFICE_EMAIL", "imaging@reyahealth.com").strip().lower(),
            os.environ.get("IMAGING_OFFICE_PASSWORD", "ImagingOffice2026"),
        )
    return None


def blank_business(business_id: str, name: str, email: str, password: str, kind: str) -> dict:
    return {
        "id": business_id,
        "name": name,
        "email": (email or "").strip().lower(),
        "password": password,
        "kind": kind,
        "base_zip": "60611",
        "transport_fee": 40 if kind == "lab" else 55,
        "bands": _copy(DEFAULT_BANDS),
        "prices": {},
        "custom_tests": [],
        "removed_codes": [],
        "content": {},
        "question_edits": {},
        "staff": [],
    }


def _owned_codes(kind: str, customs: list) -> set:
    from catalog import IMAGING_TESTS, LAB_TESTS

    source = LAB_TESTS if kind == "lab" else IMAGING_TESTS
    codes = {item["code"] for item in source}
    codes.update(item.get("code") for item in customs)
    return codes


def _migrate_kind(office: dict, stored: dict) -> None:
    kind = office["kind"]
    old = (stored.get("offices") or {}).get(kind) or {}
    if old.get("bands"):
        office["bands"] = old["bands"]
        office["base_zip"] = old.get("base_zip") or office["base_zip"]
        office["transport_fee"] = old.get("transport_fee", office["transport_fee"])
    customs = [item for item in stored.get("custom_tests") or [] if item.get("kind") == kind]
    office["custom_tests"] = customs
    owned = _owned_codes(kind, customs)
    office["prices"] = {code: price for code, price in (stored.get("prices") or {}).items() if code in owned}
    office["removed_codes"] = [code for code in stored.get("removed_codes") or [] if code in owned]
    office["content"] = {code: body for code, body in (stored.get("content") or {}).items() if code in owned}
    office["question_edits"] = (stored.get("question_edits") or {}).get(kind) or {}


def _normalize_business(row: dict) -> dict | None:
    services = row.get("services") or []
    kind = row.get("kind") or (services[0] if services else "")
    if kind not in {"lab", "imaging"} or not row.get("id"):
        return None
    seed = seed_login(row["id"])
    base = blank_business(
        row["id"],
        row.get("name") or "Business",
        (seed[0] if seed and os.environ.get("LAB_OFFICE_EMAIL" if kind == "lab" else "IMAGING_OFFICE_EMAIL") else row.get("email"))
        or (seed[0] if seed else row.get("email") or ""),
        row.get("password") or (seed[1] if seed else secrets.token_urlsafe(8)),
        kind,
    )
    if seed:
        env_email = os.environ.get("LAB_OFFICE_EMAIL" if row["id"] == "reya-lab" else "IMAGING_OFFICE_EMAIL")
        env_password = os.environ.get("LAB_OFFICE_PASSWORD" if row["id"] == "reya-lab" else "IMAGING_OFFICE_PASSWORD")
        base["email"] = (env_email or row.get("email") or seed[0]).strip().lower()
        base["password"] = env_password or row.get("password") or seed[1]
    for key in ("name", "base_zip", "transport_fee", "bands", "prices", "custom_tests", "removed_codes", "content", "question_edits", "staff"):
        if row.get(key) not in (None, "", []):
            base[key] = row[key]
        elif key in {"prices", "content", "question_edits"} and isinstance(row.get(key), dict) and row.get(key):
            base[key] = row[key]
    if isinstance(row.get("bands"), list) and row["bands"]:
        base["bands"] = row["bands"]
    return base


def load() -> dict:
    stored = {}
    if DATA.is_file():
        try:
            stored = json.loads(DATA.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            stored = {}
    if not isinstance(stored, dict):
        stored = {}
    merged = _copy(DEFAULTS)
    businesses = []
    seen = set()
    stored_rows = stored.get("businesses") if isinstance(stored.get("businesses"), list) else []
    for seed in (
        blank_business("reya-lab", "Reya Lab", *seed_login("reya-lab"), "lab"),
        blank_business("reya-imaging", "Reya Imaging", *seed_login("reya-imaging"), "imaging"),
    ):
        found = next((row for row in stored_rows if row.get("id") == seed["id"]), None)
        if isinstance(found, dict) and found.get("kind") in {"lab", "imaging"} and "password" in found:
            office = _normalize_business(found)
        else:
            office = seed
            if stored:
                _migrate_kind(office, stored)
        businesses.append(office)
        seen.add(seed["id"])
    for row in stored_rows:
        if not isinstance(row, dict) or row.get("id") in seen:
            continue
        office = _normalize_business(row)
        if office:
            businesses.append(office)
    merged["businesses"] = businesses
    return merged


def save(data: dict) -> dict:
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def list_businesses() -> list[dict]:
    return load().get("businesses") or []


def get_business(business_id: str) -> dict | None:
    for row in list_businesses():
        if row.get("id") == business_id:
            return row
    return None


def businesses_for_kind(kind: str) -> list[dict]:
    return [row for row in list_businesses() if row.get("kind") == kind]


def find_login(email: str, password: str):
    needle = (email or "").strip().lower()
    for row in list_businesses():
        if row.get("email") == needle and hmac_match(password, row.get("password") or ""):
            return row, "owner"
        for person in row.get("staff") or []:
            if person.get("email") == needle and hmac_match(password, person.get("temporary_password") or ""):
                return row, person.get("role") or "staff"
    return None


def hmac_match(left: str, right: str) -> bool:
    if not left or not right:
        return False
    return hmac_compare(left, right)


def hmac_compare(left: str, right: str) -> bool:
    import hmac

    return hmac.compare_digest(left.encode(), right.encode()) if len(left) == len(right) else False


def office_settings(business_id: str) -> dict:
    office = get_business(business_id) or {}
    if office.get("bands"):
        return office
    return {
        "base_zip": "60611",
        "transport_fee": 40,
        "bands": _copy(DEFAULT_BANDS),
    }


def quote_for_miles(miles: float, business_id: str = "reya-lab") -> dict:
    service = office_settings(business_id)
    transport = float(service.get("transport_fee") or 0)
    bands = sorted(service.get("bands") or [], key=lambda band: float(band.get("from_miles") or 0))
    miles = round(float(miles or 0), 1)
    if not bands:
        return {"served": False, "miles": miles, "reason": "Add at least one mileage rule."}
    limit = max(float(band.get("to_miles") or 0) for band in bands)
    if miles > limit:
        return {
            "served": False,
            "miles": miles,
            "limit": limit,
            "transport_fee": transport,
            "extra": 0,
            "travel_total": 0,
            "reason": f"This address is {miles} miles away. Service stops at {limit:g} miles.",
        }
    match = None
    for index, band in enumerate(bands):
        start = float(band.get("from_miles") or 0)
        end = float(band.get("to_miles") or 0)
        last = index == len(bands) - 1
        if miles >= start and (miles < end or (last and miles <= end)):
            match = band
            break
    if not match:
        return {
            "served": False,
            "miles": miles,
            "limit": limit,
            "reason": f"No price rule covers {miles} miles.",
        }
    extra = float(match.get("extra") or 0)
    return {
        "served": True,
        "miles": miles,
        "limit": limit,
        "from_miles": float(match.get("from_miles") or 0),
        "to_miles": float(match.get("to_miles") or 0),
        "transport_fee": transport,
        "extra": extra,
        "travel_total": round(transport + extra, 2),
        "base_zip": service.get("base_zip") or "",
        "reason": "",
    }


def miles_between_zips(origin: str, destination: str) -> float | None:
    start = _coordinates(origin)
    end = _coordinates(destination)
    if not start or not end:
        return None
    return _haversine(start, end)


def _coordinates(zip_code: str):
    code = "".join(character for character in str(zip_code) if character.isdigit())[:5]
    if len(code) != 5:
        return None
    if code in _COORDS:
        return _COORDS[code]
    query = urllib.parse.urlencode({"postalcode": code, "country": "us", "format": "json", "limit": 1})
    request = urllib.request.Request(
        f"https://nominatim.openstreetmap.org/search?{query}",
        headers={"User-Agent": "ReyaHealthDemo/1.0", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            rows = json.loads(response.read().decode())
    except Exception:
        return None
    if not rows:
        return None
    point = (float(rows[0]["lat"]), float(rows[0]["lon"]))
    _COORDS[code] = point
    return point


def _haversine(start, end) -> float:
    lat1, lon1 = math.radians(start[0]), math.radians(start[1])
    lat2, lon2 = math.radians(end[0]), math.radians(end[1])
    arc = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return round(3958.8 * 2 * math.asin(math.sqrt(arc)), 1)


def import_test_rows(rows: list[dict], business_id: str) -> dict:
    business = get_business(business_id)
    if not business:
        return {"added": 0, "updated": 0}
    data = load()
    office = next(row for row in data["businesses"] if row["id"] == business_id)
    added = 0
    updated = 0
    kind = office["kind"]
    for raw in rows:
        row = {str(key or "").strip().lower(): value for key, value in raw.items()}
        code = str(row.get("code") or "").strip()
        name = str(row.get("name") or "").strip()
        if not code or not name:
            continue
        price = float(row.get("price") or 0)
        existing = next((item for item in office["custom_tests"] if item.get("code") == code), None)
        payload = {
            "code": code,
            "name": name,
            "kind": kind,
            "cpt": str(row.get("cpt") or ""),
            "price": price,
            "summary": str(row.get("summary") or ""),
            "questionnaire_key": code,
        }
        if existing:
            existing.update(payload)
            updated += 1
        else:
            office["custom_tests"].append(payload)
            added += 1
        office["prices"][code] = price
        office["removed_codes"] = [item for item in office["removed_codes"] if item != code]
    save(data)
    return {"added": added, "updated": updated}


def parse_table(filename: str, raw: bytes) -> list[dict]:
    name = filename.lower()
    if name.endswith(".xlsx"):
        import openpyxl

        sheet = openpyxl.load_workbook(io.BytesIO(raw), read_only=True).active
        grid = list(sheet.iter_rows(values_only=True))
        if not grid:
            return []
        headers = [str(cell or "").strip().lower() for cell in grid[0]]
        rows = []
        for line in grid[1:]:
            rows.append({headers[index]: line[index] for index in range(min(len(headers), len(line)))})
        return rows
    text = raw.decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(text)))


def transport_fee(miles: float) -> dict:
    rule = load()["transport"]
    base = float(rule.get("base_fee") or 0)
    included = float(rule.get("included_miles") or 0)
    per_mile = float(rule.get("per_mile") or 0)
    extra_miles = max(float(miles or 0) - included, 0)
    extra = round(extra_miles * per_mile, 2)
    return {
        "base_fee": base,
        "included_miles": included,
        "per_mile": per_mile,
        "miles": float(miles or 0),
        "extra": extra,
        "total": round(base + extra, 2),
    }


def catalog_source(business: dict) -> list[dict]:
    if business.get("id") == "reya-lab":
        from catalog import LAB_TESTS

        return LAB_TESTS
    if business.get("id") == "reya-imaging":
        from catalog import IMAGING_TESTS

        return IMAGING_TESTS
    return []


def public_tests(business_id: str, source: list[dict] | None = None) -> list[dict]:
    business = get_business(business_id)
    if not business:
        return []
    if source is None:
        source = catalog_source(business)
    removed = set(business.get("removed_codes") or [])
    prices = business.get("prices") or {}
    content_map = business.get("content") or {}
    rows = []
    for item in source:
        if item.get("code") in removed:
            continue
        row = dict(item)
        if item.get("code") in prices:
            row["price"] = float(prices[item["code"]])
        content = content_map.get(item.get("code")) or {}
        if content.get("summary"):
            row["summary"] = content["summary"]
        if content.get("sections"):
            row["sections"] = content["sections"]
        rows.append(row)
    for item in business.get("custom_tests") or []:
        if item.get("code") in removed:
            continue
        if any(row.get("code") == item.get("code") for row in rows):
            continue
        code = item.get("code")
        content = content_map.get(code) or {}
        rows.append(
            {
                "code": code,
                "name": item.get("name"),
                "cpt": item.get("cpt") or "",
                "price": float(prices.get(code, item.get("price") or 0)),
                "setup_fee": 0,
                "summary": content.get("summary") or item.get("summary") or "",
                "sections": content.get("sections") or [],
                "topic": "Added test",
                "questionnaire_key": item.get("questionnaire_key") or code,
                "at_home": True,
            }
        )
    return rows


def _edit(business_id: str):
    data = load()
    office = next((row for row in data["businesses"] if row["id"] == business_id), None)
    return data, office


def saved_questions(business_id: str, key: str):
    business = get_business(business_id) or {}
    return (business.get("question_edits") or {}).get(key)


def save_questions(business_id: str, key: str, questions: list) -> None:
    data, office = _edit(business_id)
    office.setdefault("question_edits", {})[key] = questions
    save(data)


def save_content(business_id: str, code: str, summary: str, sections: list) -> None:
    data, office = _edit(business_id)
    office.setdefault("content", {})[code] = {"summary": summary, "sections": sections}
    save(data)


def save_office_rules(business_id: str, base_zip: str, transport_fee: float, bands: list) -> dict:
    data, office = _edit(business_id)
    office["base_zip"] = base_zip
    office["transport_fee"] = transport_fee
    office["bands"] = bands
    save(data)
    return office


def add_test(business_id: str, test: dict) -> dict:
    data, office = _edit(business_id)
    code = test["code"].strip()
    payload = {
        "code": code,
        "name": test["name"].strip(),
        "kind": office["kind"],
        "cpt": test.get("cpt") or "",
        "price": float(test.get("price") or 0),
        "summary": test.get("summary") or "",
        "questionnaire_key": code,
    }
    current = next((item for item in office["custom_tests"] if item.get("code") == code), None)
    if current:
        current.update(payload)
    else:
        office["custom_tests"].append(payload)
    office["prices"][code] = payload["price"]
    office["removed_codes"] = [item for item in office["removed_codes"] if item != code]
    save(data)
    return payload


def remove_test(business_id: str, code: str) -> None:
    data, office = _edit(business_id)
    office["custom_tests"] = [item for item in office["custom_tests"] if item.get("code") != code]
    if code not in office["removed_codes"]:
        office["removed_codes"].append(code)
    save(data)


def set_price(business_id: str, code: str, price: float) -> None:
    data, office = _edit(business_id)
    office.setdefault("prices", {})[code] = price
    save(data)


def register_business(name: str, email: str, kind: str) -> dict:
    data = load()
    needle = email.strip().lower()
    for row in data["businesses"]:
        if row.get("email") == needle or any(person.get("email") == needle for person in row.get("staff") or []):
            raise ValueError("That email already has a login.")
    business = blank_business(f"biz-{int(__import__('time').time())}", name.strip(), needle, secrets.token_urlsafe(8), kind)
    data["businesses"].append(business)
    save(data)
    return business


def issue_invite(business_id: str, email: str, role: str, name: str) -> dict:
    data, office = _edit(business_id)
    needle = email.strip().lower()
    for row in data["businesses"]:
        if row.get("email") == needle or any(person.get("email") == needle for person in row.get("staff") or []):
            if not (row["id"] == business_id and any(person.get("email") == needle for person in row.get("staff") or [])):
                raise ValueError("That email already has a login.")
    temporary = secrets.token_urlsafe(8)
    invite = {
        "email": needle,
        "role": role,
        "name": name.strip(),
        "temporary_password": temporary,
    }
    office["staff"] = [row for row in office.get("staff") or [] if row.get("email") != needle]
    office["staff"].append(invite)
    save(data)
    try:
        _send_email(invite, office["name"])
    except Exception:
        invite["email_failed"] = True
    return invite


def apply_prices(items: list[dict]) -> list[dict]:
    prices = load().get("prices") or {}
    rows = []
    for item in items:
        row = dict(item)
        code = row.get("code")
        if code in prices:
            row["price"] = float(prices[code])
        rows.append(row)
    return rows


def _send_email(invite: dict, business_name: str = "Reya Health") -> None:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        return
    import smtplib
    from email.message import EmailMessage

    message = EmailMessage()
    message["Subject"] = "Your Reya Health login"
    message["From"] = os.environ.get("SMTP_FROM", "noreply@reyahealth.com")
    message["To"] = invite["email"]
    message.set_content(
        f"Hello {invite['name'] or invite['email']},\n\n"
        f"A {invite['role']} login was created for {business_name}.\n"
        f"Email: {invite['email']}\n"
        f"Temporary password: {invite['temporary_password']}\n"
    )
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587"))) as smtp:
        if os.environ.get("SMTP_USER"):
            smtp.starttls()
            smtp.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASSWORD", ""))
        smtp.send_message(message)
