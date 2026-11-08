"""Card payment for the customer total. Keys stay in the environment."""

import os


def configured() -> bool:
    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    public = os.environ.get("STRIPE_PUBLISHABLE_KEY", "").strip()
    return secret.startswith(("sk_", "rk_")) and public.startswith("pk_")


def create_intent(amount_cents: int) -> dict:
    import stripe

    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    public = os.environ.get("STRIPE_PUBLISHABLE_KEY", "").strip()
    stripe.api_key = secret
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        automatic_payment_methods={"enabled": True},
        description="Reya Health self-pay visit",
    )
    return {"client_secret": intent.client_secret or "", "publishable_key": public}
