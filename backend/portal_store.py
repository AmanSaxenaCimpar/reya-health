"""Back-office settings saved on the server. Not the old portal logins."""

import json
import os
import secrets
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data" / "portal.json"

DEFAULTS = {
    "transport": {
        "base_fee": 40,
        "included_miles": 10,
        "per_mile": 2,
    },
    "prices": {},
    "businesses": [],
    "invites": [],
}


def load() -> dict:
    if not DATA.is_file():
        return json.loads(json.dumps(DEFAULTS))
    try:
        stored = json.loads(DATA.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return json.loads(json.dumps(DEFAULTS))
    merged = json.loads(json.dumps(DEFAULTS))
    merged.update({key: value for key, value in stored.items() if key in merged})
    if isinstance(stored.get("transport"), dict):
        merged["transport"].update(stored["transport"])
    return merged


def save(data: dict) -> dict:
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


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


def issue_invite(email: str, role: str, name: str) -> dict:
    data = load()
    temporary = secrets.token_urlsafe(8)
    invite = {
        "email": email.strip().lower(),
        "role": role,
        "name": name.strip(),
        "temporary_password": temporary,
    }
    data["invites"] = [row for row in data.get("invites") or [] if row.get("email") != invite["email"]]
    data["invites"].append(invite)
    save(data)
    try:
        _send_email(invite)
    except Exception:
        invite["email_failed"] = True
    return invite


def _send_email(invite: dict) -> None:
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
        f"A {invite['role']} login was created for Reya Health.\n"
        f"Email: {invite['email']}\n"
        f"Temporary password: {invite['temporary_password']}\n"
    )
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587"))) as smtp:
        if os.environ.get("SMTP_USER"):
            smtp.starttls()
            smtp.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASSWORD", ""))
        smtp.send_message(message)
