"""Write a completed booking into SharePoint lists through Microsoft Graph."""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from urllib.parse import urlparse

GRAPH = "https://graph.microsoft.com/v1.0"
BOOKING_LIST = "Reya Bookings"
TEST_LIST = "Reya Booking Tests"

_token = {"value": "", "expires": 0.0}


class SharePointError(Exception):
    pass


def configured() -> bool:
    return all(_setting(name) for name in (
        "SHAREPOINT_TENANT_ID",
        "SHAREPOINT_CLIENT_ID",
        "SHAREPOINT_CLIENT_SECRET",
        "SHAREPOINT_SITE_URL",
    ))


def save_booking(booking: dict) -> dict:
    token = _access_token()
    site_id = _site_id(token)
    bookings = _ensure_list(site_id, token, BOOKING_LIST, _booking_columns())
    tests = _ensure_list(site_id, token, TEST_LIST, _test_columns())

    info = booking.get("info") or {}
    title = f"{info.get('last', '').strip()}, {info.get('first', '').strip()}".strip(", ")
    when = f"{booking.get('appointment_date') or ''} {booking.get('appointment_time') or ''}".strip()
    if when:
        title = f"{title} — {when}" if title else when
    title = (title or "Reya booking")[:255]

    parent = _add_item(site_id, token, bookings, {
        "Title": title,
        "Company": _clip(booking.get("company")),
        "Service": _clip(booking.get("service")),
        "Zip": _clip(booking.get("zip")),
        "Address": _note(booking.get("address")),
        "OrderOnFile": _clip(booking.get("order")),
        "OrderFileName": _clip(booking.get("order_file")),
        "LabTests": _note(_tests_text(booking.get("labs") or [])),
        "ImagingTests": _note(_tests_text(booking.get("imaging") or [])),
        "AppointmentDate": _clip(booking.get("appointment_date")),
        "AppointmentTime": _clip(booking.get("appointment_time")),
        "FirstName": _clip(info.get("first")),
        "LastName": _clip(info.get("last")),
        "DateOfBirth": _clip(info.get("dob")),
        "Gender": _clip(info.get("gender")),
        "Relationship": _clip(info.get("relationship")),
        "Phone": _clip(info.get("phone")),
        "Email": _clip(info.get("email")),
        "Questionnaires": _note(_questions_text(booking.get("questions") or [])),
        "ServiceFee": _money(booking.get("service_fee")),
        "SetupFee": _money(booking.get("setup_fee")),
        "Total": _money(booking.get("total")),
    })
    booking_id = str(parent.get("id") or "")
    test_ids = []
    for kind, rows in (("Lab", booking.get("labs") or []), ("Imaging", booking.get("imaging") or [])):
        for test in rows:
            item = _add_item(site_id, token, tests, {
                "Title": _clip(test.get("name") or test.get("code") or kind),
                "BookingId": booking_id,
                "BookingTitle": title,
                "TestType": kind,
                "TestCode": _clip(test.get("code")),
                "Cpt": _clip(test.get("cpt")),
                "Price": _money(test.get("price")),
                "SetupFee": _money(test.get("setup_fee")),
            })
            if item.get("id"):
                test_ids.append(str(item["id"]))
    return {
        "saved": True,
        "booking_id": booking_id,
        "test_count": len(test_ids),
        "lists": [BOOKING_LIST, TEST_LIST],
    }


def _setting(name: str) -> str:
    return os.environ.get(name, "").strip()


def _access_token() -> str:
    now = time.time()
    if _token["value"] and now < _token["expires"]:
        return _token["value"]
    tenant = _setting("SHAREPOINT_TENANT_ID")
    body = urllib.parse.urlencode({
        "client_id": _setting("SHAREPOINT_CLIENT_ID"),
        "client_secret": _setting("SHAREPOINT_CLIENT_SECRET"),
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
    }).encode()
    request = urllib.request.Request(
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    payload = _open(request)
    access = payload.get("access_token")
    if not access:
        raise SharePointError("Microsoft did not return an access token. Check the SharePoint app registration.")
    _token["value"] = access
    _token["expires"] = now + max(int(payload.get("expires_in") or 3600) - 120, 60)
    return access


def _site_id(token: str) -> str:
    parsed = urlparse(_setting("SHAREPOINT_SITE_URL"))
    if not parsed.hostname:
        raise SharePointError("SHAREPOINT_SITE_URL must be a full SharePoint site address.")
    path = parsed.path.rstrip("/")
    target = f"{GRAPH}/sites/{parsed.hostname}:{path}" if path else f"{GRAPH}/sites/{parsed.hostname}"
    payload = _graph("GET", target, token)
    site_id = payload.get("id")
    if not site_id:
        raise SharePointError("The SharePoint site was not found. Check SHAREPOINT_SITE_URL.")
    return site_id


def _ensure_list(site_id: str, token: str, display_name: str, columns: list[dict]) -> str:
    existing = _find_list(site_id, token, display_name)
    if not existing:
        created = _graph("POST", f"{GRAPH}/sites/{site_id}/lists", token, {
            "displayName": display_name,
            "columns": columns,
            "list": {"template": "genericList"},
        })
        existing = created.get("id")
        if not existing:
            raise SharePointError(f"Could not create the {display_name} list.")
        return existing
    present = {
        column.get("name")
        for column in _graph("GET", f"{GRAPH}/sites/{site_id}/lists/{existing}/columns", token).get("value", [])
    }
    for column in columns:
        if column["name"] not in present:
            _graph("POST", f"{GRAPH}/sites/{site_id}/lists/{existing}/columns", token, column)
    return existing


def _find_list(site_id: str, token: str, display_name: str) -> str | None:
    url = f"{GRAPH}/sites/{site_id}/lists?$select=id,displayName"
    while url:
        payload = _graph("GET", url, token)
        for row in payload.get("value") or []:
            if row.get("displayName") == display_name:
                return row.get("id")
        url = payload.get("@odata.nextLink")
    return None


def _add_item(site_id: str, token: str, list_id: str, fields: dict) -> dict:
    return _graph("POST", f"{GRAPH}/sites/{site_id}/lists/{list_id}/items", token, {"fields": fields})


def _booking_columns() -> list[dict]:
    text = ["Company", "Service", "Zip", "OrderOnFile", "OrderFileName", "AppointmentDate", "AppointmentTime",
            "FirstName", "LastName", "DateOfBirth", "Gender", "Relationship", "Phone", "Email"]
    notes = ["Address", "LabTests", "ImagingTests", "Questionnaires"]
    columns = [_text_column(name) for name in text]
    columns.extend(_note_column(name) for name in notes)
    columns.extend(_number_column(name) for name in ("ServiceFee", "SetupFee", "Total"))
    return columns


def _test_columns() -> list[dict]:
    columns = [_text_column(name) for name in ("BookingId", "BookingTitle", "TestType", "TestCode", "Cpt")]
    columns.extend(_number_column(name) for name in ("Price", "SetupFee"))
    return columns


def _text_column(name: str) -> dict:
    return {"name": name, "text": {}}


def _note_column(name: str) -> dict:
    return {
        "name": name,
        "text": {
            "allowMultipleLines": True,
            "appendChangesToExistingText": False,
            "linesForEditing": 6,
            "textType": "plain",
        },
    }


def _number_column(name: str) -> dict:
    return {"name": name, "number": {"decimalPlaces": "two"}}


def _tests_text(tests: list[dict]) -> str:
    lines = []
    for test in tests:
        price = _money(test.get("price"))
        setup = _money(test.get("setup_fee"))
        line = f"{test.get('name') or ''} ({test.get('code') or ''}) · CPT {test.get('cpt') or '—'}"
        line += f" · ${price:.2f}"
        if setup:
            line += f" · setup ${setup:.2f}"
        lines.append(line)
    return "\n".join(lines)


def _questions_text(sections: list[dict]) -> str:
    lines = []
    for section in sections:
        lines.append(str(section.get("title") or "Questions"))
        for item in section.get("items") or []:
            lines.append(f"- {item.get('prompt') or ''}: {item.get('answer') or ''}")
        lines.append("")
    return "\n".join(lines).strip()


def _clip(value) -> str:
    return str(value or "").strip()[:255]


def _note(value) -> str:
    return str(value or "").strip()[:60000]


def _money(value) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _graph(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    headers = {"Accept": "application/json", "Authorization": f"Bearer {token}"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    return _open(request)


def _open(request: urllib.request.Request) -> dict:
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read().decode()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise SharePointError(_graph_message(detail, error.code)) from None


def _graph_message(detail: str, status: int) -> str:
    try:
        payload = json.loads(detail)
        message = payload.get("error", {}).get("message") or payload.get("error_description") or ""
    except json.JSONDecodeError:
        message = detail
    message = " ".join(str(message).split())
    if not message:
        message = "SharePoint rejected the booking."
    return f"{message[:400]} ({status})"
