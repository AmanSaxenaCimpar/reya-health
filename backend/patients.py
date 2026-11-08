"""Patient accounts, visits, documents, and messages. Stored beside the back office data."""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "data"
DATA = ROOT / "patients.json"
FILES = ROOT / "patient_files"
MAX_BYTES = 8_000_000
LOCK = threading.Lock()
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
}


class PatientError(Exception):
    pass


def signup(name: str, email: str, password: str) -> dict:
    name = " ".join(str(name or "").split())
    email = str(email or "").strip().lower()
    password = str(password or "")
    if len(name) < 2:
        raise PatientError("Enter your name.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise PatientError("Enter a valid email.")
    if len(password) < 8:
        raise PatientError("Use a password of at least 8 characters.")
    with LOCK:
        data = _load()
        if any(row["email"] == email for row in data["accounts"]):
            raise PatientError("An account with that email already exists. Sign in instead.")
        account = {
            "id": secrets.token_urlsafe(12),
            "name": name,
            "email": email,
            "salt": secrets.token_hex(16),
            "password_hash": "",
            "created": _now(),
        }
        account["password_hash"] = _hash(password, account["salt"])
        data["accounts"].append(account)
        _save(data)
    return _public_account(account)


def login(email: str, password: str) -> dict:
    email = str(email or "").strip().lower()
    password = str(password or "")
    data = _load()
    account = next((row for row in data["accounts"] if row["email"] == email), None)
    if account is None or not hmac.compare_digest(_hash(password, account["salt"]), account["password_hash"]):
        raise PatientError("That email or password is not recognized.")
    return _public_account(account)


def token_for(account_id: str) -> str:
    expires = str(int(time.time()) + 60 * 60 * 12)
    payload = f"patient|{account_id}|{expires}"
    signature = hmac.new(_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}|{signature}"


def account_from_token(token: str) -> dict:
    parts = (token or "").split("|")
    if len(parts) != 4 or parts[0] != "patient":
        raise PatientError("Sign in again.")
    _, account_id, expires, signature = parts
    payload = f"patient|{account_id}|{expires}"
    expected = hmac.new(_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected) or int(expires) < time.time():
        raise PatientError("Sign in again.")
    account = next((row for row in _load()["accounts"] if row["id"] == account_id), None)
    if account is None:
        raise PatientError("Sign in again.")
    return account


def record_visit(token: str, booking: dict, order: dict) -> dict:
    account = account_from_token(token)
    tests = booking.get("imaging") if booking.get("service") == "imaging" else booking.get("labs")
    info = booking.get("info") or {}
    visit = {
        "id": secrets.token_urlsafe(12),
        "patient_id": account["id"],
        "patient_name": account["name"],
        "patient_email": account["email"],
        "business": booking.get("business") or "",
        "company": booking.get("company") or "",
        "service": booking.get("service") or "",
        "appointment_date": booking.get("appointment_date") or "",
        "appointment_time": booking.get("appointment_time") or "",
        "address": booking.get("address") or booking.get("zip") or "",
        "tests": [item.get("name") or item.get("code") or "Test" for item in (tests or [])],
        "total": booking.get("total") or 0,
        "order_id": order.get("order_id") or "",
        "order_file": order.get("order_file") or "",
        "order_source": "uploaded" if str(booking.get("order") or "").lower() == "yes" else "created",
        "documents": [],
        "messages": [],
        "created": _now(),
    }
    if visit["order_id"]:
        visit["documents"].append(
            {
                "id": secrets.token_urlsafe(12),
                "name": visit["order_file"] or "order.pdf",
                "content_type": order.get("order_content_type") or "application/pdf",
                "kind": "order",
                "order_id": visit["order_id"],
                "by": "patient" if visit["order_source"] == "uploaded" else "reya",
                "created": visit["created"],
            }
        )
    with LOCK:
        data = _load()
        data["visits"].append(visit)
        _save(data)
    return _public_visit(visit)


def visits_for_patient(token: str) -> dict:
    account = account_from_token(token)
    rows = [row for row in _load()["visits"] if row["patient_id"] == account["id"]]
    rows.sort(key=lambda row: row.get("created") or "", reverse=True)
    return {"name": account["name"], "email": account["email"], "visits": [_public_visit(row) for row in rows]}


def visits_for_business(business_id: str) -> list:
    rows = [row for row in _load()["visits"] if row.get("business") == business_id]
    rows.sort(key=lambda row: row.get("created") or "", reverse=True)
    return [_public_visit(row) for row in rows]


def add_document(token: str, visit_id: str, name: str, content_type: str, content: str, kind: str = "document") -> dict:
    account = account_from_token(token)
    return _add_file(visit_id, name, content_type, content, kind, "patient", account["id"], None)


def add_office_result(visit_id: str, business_id: str, name: str, content_type: str, content: str) -> dict:
    return _add_file(visit_id, name, content_type, content, "result", "office", None, business_id)


def add_message(token: str, visit_id: str, body: str) -> dict:
    account = account_from_token(token)
    return _add_message(visit_id, body, "patient", account["name"], account["id"], None)


def add_office_message(visit_id: str, business_id: str, author: str, body: str) -> dict:
    return _add_message(visit_id, body, "office", author or "Care team", None, business_id)


def read_document(doc_id: str, token: str = "", business_id: str = ""):
    visit, document = _find_document(doc_id)
    if token:
        account = account_from_token(token)
        if visit["patient_id"] != account["id"]:
            raise PatientError("That file is not on your account.")
    elif business_id:
        if visit.get("business") != business_id:
            raise PatientError("That file belongs to another business.")
    else:
        raise PatientError("Sign in again.")
    if document.get("kind") == "order":
        return None
    path = FILES / document["id"]
    if not path.is_file():
        return None
    return path, document.get("name") or "document", document.get("content_type") or "application/octet-stream"


def _add_file(visit_id, name, content_type, content, kind, by, patient_id, business_id) -> dict:
    content_type = str(content_type or "").split(";")[0].strip().lower()
    try:
        data = base64.b64decode(content or "", validate=True)
    except Exception as error:
        raise PatientError("That file could not be read. Use a PDF or an image.") from error
    if not data or len(data) > MAX_BYTES:
        raise PatientError("Use a PDF or image under 8 MB.")
    if content_type not in ALLOWED_TYPES:
        raise PatientError("Upload a PDF or an image.")
    with LOCK:
        store = _load()
        visit = _owned_visit(store, visit_id, patient_id, business_id)
        document = {
            "id": secrets.token_urlsafe(12),
            "name": _safe_name(name, content_type),
            "content_type": content_type,
            "kind": kind if kind in {"document", "result"} else "document",
            "by": by,
            "created": _now(),
        }
        FILES.mkdir(parents=True, exist_ok=True)
        (FILES / document["id"]).write_bytes(data)
        visit["documents"].append(document)
        _save(store)
    return document


def _add_message(visit_id, body, by, author, patient_id, business_id) -> dict:
    text = " ".join(str(body or "").split())
    if not text:
        raise PatientError("Write a message first.")
    if len(text) > 2000:
        raise PatientError("Keep the message under 2000 characters.")
    with LOCK:
        store = _load()
        visit = _owned_visit(store, visit_id, patient_id, business_id)
        message = {"id": secrets.token_urlsafe(8), "body": text, "by": by, "author": author, "created": _now()}
        visit["messages"].append(message)
        _save(store)
    return message


def _owned_visit(store, visit_id, patient_id, business_id):
    visit = next((row for row in store["visits"] if row["id"] == visit_id), None)
    if visit is None:
        raise PatientError("That visit was not found.")
    if patient_id and visit["patient_id"] != patient_id:
        raise PatientError("That visit is not on your account.")
    if business_id and visit.get("business") != business_id:
        raise PatientError("That visit belongs to another business.")
    visit.setdefault("documents", [])
    visit.setdefault("messages", [])
    return visit


def _find_document(doc_id: str):
    for visit in _load()["visits"]:
        for document in visit.get("documents") or []:
            if document.get("id") == doc_id:
                return visit, document
    raise PatientError("That file was not found.")


def _public_account(account: dict) -> dict:
    return {"id": account["id"], "name": account["name"], "email": account["email"]}


def _public_visit(visit: dict) -> dict:
    hidden = {"patient_id"}
    return {key: value for key, value in visit.items() if key not in hidden}


def _hash(password: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return digest.hex()


def _secret() -> str:
    return os.environ.get("OFFICE_TOKEN_SECRET", "ReyaOfficeToken2026")


def _load() -> dict:
    if not DATA.is_file():
        return {"accounts": [], "visits": []}
    try:
        data = json.loads(DATA.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"accounts": [], "visits": []}
    data.setdefault("accounts", [])
    data.setdefault("visits", [])
    return data


def _save(data: dict) -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    temporary = DATA.with_suffix(".tmp")
    temporary.write_text(json.dumps(data), encoding="utf-8")
    temporary.replace(DATA)


def _safe_name(name: str, content_type: str) -> str:
    base = Path(str(name or "document")).name
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip(".-") or "document"
    suffix = ALLOWED_TYPES.get(content_type, "")
    if suffix and not base.lower().endswith(suffix):
        base = f"{base}{suffix}"
    return base[:80]


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
