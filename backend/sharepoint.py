"""Post a completed booking to a Power Automate HTTP trigger."""

import json
import os
import urllib.error
import urllib.request


class SharePointError(Exception):
    pass


def configured() -> bool:
    return bool(os.environ.get("POWER_AUTOMATE_URL", "").strip())


def save_booking(booking: dict) -> dict:
    url = os.environ.get("POWER_AUTOMATE_URL", "").strip()
    if not url.startswith("https://"):
        raise SharePointError("POWER_AUTOMATE_URL must be the https link from the Power Automate trigger.")
    payload = _flat_booking(booking)
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            response.read()
            status = response.status
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise SharePointError(_safe_message(detail, error.code)) from None
    if status not in (200, 202):
        raise SharePointError(f"Power Automate returned status {status}.")
    return {"saved": True, "destination": "power_automate"}


def _flat_booking(booking: dict) -> dict:
    info = booking.get("info") or {}
    first = str(info.get("first") or "").strip()
    last = str(info.get("last") or "").strip()
    when = f"{booking.get('appointment_date') or ''} {booking.get('appointment_time') or ''}".strip()
    title = ", ".join(part for part in (last, first) if part)
    if when:
        title = f"{title} — {when}" if title else when
    return {
        "title": title or "Reya booking",
        "company": booking.get("company") or "",
        "service": booking.get("service") or "",
        "zip": booking.get("zip") or "",
        "address": booking.get("address") or "",
        "order": booking.get("order") or "",
        "order_file": booking.get("order_file") or "",
        "appointment_date": booking.get("appointment_date") or "",
        "appointment_time": booking.get("appointment_time") or "",
        "first_name": first,
        "last_name": last,
        "date_of_birth": info.get("dob") or "",
        "gender": info.get("gender") or "",
        "relationship": info.get("relationship") or "",
        "phone": info.get("phone") or "",
        "email": info.get("email") or "",
        "labs": _tests_text(booking.get("labs") or []),
        "imaging": _tests_text(booking.get("imaging") or []),
        "questionnaires": _questions_text(booking.get("questions") or []),
        "service_fee": _money(booking.get("service_fee")),
        "setup_fee": _money(booking.get("setup_fee")),
        "total": _money(booking.get("total")),
    }


def _tests_text(tests: list) -> str:
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


def _questions_text(sections: list) -> str:
    lines = []
    for section in sections:
        lines.append(str(section.get("title") or "Questions"))
        for item in section.get("items") or []:
            lines.append(f"- {item.get('prompt') or ''}: {item.get('answer') or ''}")
        lines.append("")
    return "\n".join(lines).strip()


def _money(value) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _safe_message(detail: str, status: int) -> str:
    text = " ".join(detail.split())
    if not text or "http" in text.lower():
        text = "Power Automate rejected the booking."
    return f"{text[:240]} ({status})"
