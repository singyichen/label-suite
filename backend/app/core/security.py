"""Password hashing primitives (FR-080).

Centralizes all password hash/verify logic in a single module using
`bcrypt` directly (cost factor >= 12) — design.md decision 5 chose the
`bcrypt` package over passlib, whose bcrypt backend is unmaintained
against recent bcrypt releases. MD5, SHA-1, and unsalted SHA-256 must
never be used to hash passwords anywhere else in the codebase.
"""

from __future__ import annotations

import bcrypt

BCRYPT_COST_FACTOR = 12

#: bcrypt only consumes the first 72 bytes of its input, and bcrypt >= 4
#: raises rather than silently truncating past that. The ceiling is
#: measured in UTF-8 *bytes*, not characters, so zh-TW text reaches it at
#: 24 characters — well inside what a real user of this product types.
#: Callers must surface this as a 4xx validation error, never a 500.
MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt.

    Args:
        password: The plaintext password to hash. Must be at most
            `MAX_PASSWORD_BYTES` bytes when UTF-8 encoded.

    Returns:
        The bcrypt hash (including algorithm identifier, cost factor, and
        salt), decoded to a UTF-8 string suitable for storage.

    Raises:
        ValueError: If `password` exceeds `MAX_PASSWORD_BYTES` UTF-8 bytes.
            Rejecting is deliberate: silently truncating would make two
            distinct passwords sharing a 72-byte prefix interchangeable.
    """
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise ValueError(f"password must be at most {MAX_PASSWORD_BYTES} bytes when UTF-8 encoded")

    salt = bcrypt.gensalt(rounds=BCRYPT_COST_FACTOR)
    hashed = bcrypt.hashpw(encoded, salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    Args:
        password: The plaintext password to verify.
        hashed_password: The bcrypt hash to verify against, as produced by
            `hash_password`.

    Returns:
        `True` if `password` matches `hashed_password`, `False` otherwise.
        A password exceeding `MAX_PASSWORD_BYTES` returns `False` rather
        than raising: `hash_password` rejects such passwords, so no stored
        hash can match one, and raising would let an over-long login
        attempt turn into a 500.
    """
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        return False

    return bcrypt.checkpw(encoded, hashed_password.encode("utf-8"))
