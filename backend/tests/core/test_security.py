"""Tests for `app.core.security` — centralized bcrypt password hashing (FR-080).

Covers the two scenarios of the canonical "密碼雜湊原語" requirement (往返驗證 /
拒絕錯誤密碼) plus the cost-factor floor named in the same requirement text
(bcrypt, cost factor >= 12).
"""

import pytest

from app.core.security import MAX_PASSWORD_BYTES, hash_password, verify_password


def test_hash_and_verify_round_trip() -> None:
    """A password verified against its own hash succeeds (往返驗證 scenario)."""
    hashed = hash_password("correct horse battery staple")

    assert verify_password("correct horse battery staple", hashed) is True


def test_verify_rejects_wrong_password() -> None:
    """Verifying with a different plaintext returns False (拒絕錯誤密碼 scenario)."""
    hashed = hash_password("correct horse battery staple")

    assert verify_password("a completely different password", hashed) is False


def test_hash_uses_bcrypt_cost_factor_at_least_12() -> None:
    """The produced hash encodes a bcrypt cost factor of at least 12."""
    hashed = hash_password("correct horse battery staple")

    # bcrypt hash format: "$<algorithm>$<cost>$<salt+digest>".
    cost_factor = int(hashed.split("$")[2])
    assert cost_factor >= 12


def test_hash_accepts_a_password_at_the_byte_limit() -> None:
    """A password exactly at bcrypt's byte ceiling still hashes and verifies."""
    password = "a" * MAX_PASSWORD_BYTES

    assert verify_password(password, hash_password(password)) is True


def test_hash_rejects_a_password_over_the_byte_limit() -> None:
    """Over-long passwords raise a documented `ValueError`, not bcrypt's opaque one."""
    password = "a" * (MAX_PASSWORD_BYTES + 1)

    with pytest.raises(ValueError, match="72 bytes"):
        hash_password(password)


def test_hash_measures_the_limit_in_utf8_bytes_not_characters() -> None:
    """The ceiling is counted in UTF-8 bytes, so multibyte text hits it sooner.

    A zh-TW password is 3 bytes per character, so 24 characters already
    reach the 72-byte ceiling and 25 exceed it — well within what a real
    user of this Traditional-Chinese product would type.
    """
    assert len(("密" * 24).encode("utf-8")) == MAX_PASSWORD_BYTES

    assert verify_password("密" * 24, hash_password("密" * 24)) is True
    with pytest.raises(ValueError, match="72 bytes"):
        hash_password("密" * 25)


def test_verify_returns_false_for_a_password_over_the_byte_limit() -> None:
    """Verification of an over-long password is a plain miss, never an exception.

    No such password can ever have been hashed (`hash_password` rejects
    it), so the only correct answer is `False`. Raising here would turn a
    hostile over-long login attempt into a 500.
    """
    hashed = hash_password("correct horse battery staple")

    assert verify_password("a" * (MAX_PASSWORD_BYTES + 1), hashed) is False
