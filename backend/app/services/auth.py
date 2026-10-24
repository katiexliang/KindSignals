"""Authentication: password hashing and signed session tokens.

Scope note: this is hackathon-grade auth suitable for a local demo. Passwords
are hashed with bcrypt and never stored in plaintext. Sessions use a signed
(itsdangerous) token carrying the user id — not a full JWT with rotation,
refresh, or revocation. Over localhost HTTP this is reasonable for a demo but
is NOT production-hardened (no HTTPS enforcement, email verification, rate
limiting, or refresh tokens).
"""

from __future__ import annotations

import bcrypt
from fastapi import Depends, Header, HTTPException
from itsdangerous import BadSignature, URLSafeSerializer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

_SALT = "kindsignals.session"
_MAX_PW_BYTES = 72  # bcrypt hard limit


def _serializer() -> URLSafeSerializer:
    return URLSafeSerializer(settings.auth_secret, salt=_SALT)


def hash_password(password: str) -> str:
    """Hash a password with bcrypt. Enforces bcrypt's 72-byte input limit."""
    pw = password.encode("utf-8")[:_MAX_PW_BYTES]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(
            password.encode("utf-8")[:_MAX_PW_BYTES],
            password_hash.encode("utf-8"),
        )
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    """Create a signed session token for a user id."""
    return _serializer().dumps({"uid": user_id})


def _user_id_from_token(token: str) -> int | None:
    try:
        data = _serializer().loads(token)
    except BadSignature:
        return None
    uid = data.get("uid")
    return int(uid) if isinstance(uid, int) else None


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency: resolve the authenticated user from a Bearer token.

    Raises 401 if the token is missing, malformed, or does not match a user.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    uid = _user_id_from_token(token)
    if uid is None:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.get(User, uid)
    if user is None:
        raise HTTPException(status_code=401, detail="Session user not found")
    return user
