"""Shared checks for patient details."""

import re
from datetime import date

EMAIL = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
NAME = re.compile(r"^[A-Za-z][A-Za-z .'\-]*$")


def check_name(value: str, label: str) -> str:
    name = " ".join(str(value or "").split())
    if len(name) < 2 or not NAME.match(name):
        return f"Enter a {label} using letters."
    return ""


def check_email(value: str) -> str:
    email = str(value or "").strip()
    if not EMAIL.match(email):
        return "Enter a valid email, like name@email.com."
    return ""


def check_phone(value: str, required: bool = True) -> str:
    digits = re.sub(r"\D", "", str(value or ""))
    if not digits:
        return "Enter a 10-digit phone number." if required else ""
    if len(digits) != 10:
        return "Enter a 10-digit phone number."
    return ""


def check_zip(value: str, required: bool = False) -> str:
    zip_code = str(value or "").strip()
    if not zip_code:
        return "Enter a 5-digit ZIP code." if required else ""
    if not re.fullmatch(r"\d{5}", zip_code):
        return "Enter a 5-digit ZIP code."
    return ""


def check_state(value: str) -> str:
    state = str(value or "").strip()
    if not state:
        return ""
    if not re.fullmatch(r"[A-Za-z]{2}", state):
        return "Enter the state as two letters, like IL."
    return ""


def check_adult_dob(value: str, required: bool = True) -> str:
    text = str(value or "").strip()
    if not text:
        return "Enter the date of birth as mm/dd/yyyy." if required else ""
    match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if not match:
        return "Enter the date of birth as mm/dd/yyyy."
    month, day, year = (int(part) for part in match.groups())
    try:
        born = date(year, month, day)
    except ValueError:
        return "That date of birth is not a real date."
    today = date.today()
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    if age < 18:
        return "Patients must be 18 or older."
    if age > 120:
        return "Check the date of birth."
    return ""


def booking_info_errors(info: dict) -> list[str]:
    problems = [
        check_name(info.get("first"), "first name"),
        check_name(info.get("last"), "last name"),
        check_adult_dob(info.get("dob")),
        "" if info.get("gender") else "Choose a gender.",
        "" if info.get("relationship") else "Choose who the visit is for.",
        check_name(info.get("preferred"), "preferred name") if info.get("preferred") else "",
        check_phone(info.get("phone")),
        check_email(info.get("email")),
    ]
    return [item for item in problems if item]


def profile_errors(fields: dict) -> list[str]:
    problems = [
        check_phone(fields.get("phone"), required=False),
        check_adult_dob(fields.get("dob"), required=False),
        check_zip(fields.get("zip")),
        check_state(fields.get("state")),
        check_phone(fields.get("pharmacy_phone"), required=False),
    ]
    return [item for item in problems if item]
