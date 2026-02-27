import os
import time
import logging
import requests as http_requests
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from pydantic import BaseModel

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

security = HTTPBearer(auto_error=False)

# JWKS cache (for ES256 tokens)
_jwks_cache: dict = {}
_jwks_cache_expiry: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


class AuthUser(BaseModel):
    sub: str          # Supabase user ID
    email: Optional[str] = None
    role: Optional[str] = None
    first_name: Optional[str] = None


def _fetch_jwks() -> dict:
    """Fetch and cache JWKS public keys from Supabase."""
    global _jwks_cache, _jwks_cache_expiry

    if _jwks_cache and time.time() < _jwks_cache_expiry:
        return _jwks_cache

    if not SUPABASE_URL:
        logger.warning("SUPABASE_URL not set, cannot fetch JWKS")
        return {}

    try:
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        resp = http_requests.get(jwks_url, timeout=10)
        if resp.status_code == 200:
            _jwks_cache = resp.json()
            _jwks_cache_expiry = time.time() + JWKS_CACHE_TTL
            logger.info(f"JWKS fetched: {len(_jwks_cache.get('keys', []))} keys")
            return _jwks_cache
        else:
            logger.warning(f"JWKS fetch failed: HTTP {resp.status_code}")
    except Exception as e:
        logger.warning(f"JWKS fetch error: {e}")

    return _jwks_cache  # return stale cache if available


def _get_es256_key(token: str):
    """Extract the ES256 public key from JWKS matching the token's kid."""
    jwks_data = _fetch_jwks()
    if not jwks_data or "keys" not in jwks_data:
        return None

    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    for key_data in jwks_data["keys"]:
        if kid and key_data.get("kid") != kid:
            continue
        if key_data.get("kty") == "EC":
            return jwk.construct(key_data, algorithm="ES256")

    return None


def _decode_token(token: str) -> AuthUser:
    """Decode and validate a Supabase JWT token."""
    token_alg = "unknown"
    try:
        header = jwt.get_unverified_header(token)
        token_alg = header.get("alg", "unknown")

        if token_alg.startswith("ES"):
            # ES256/ES384/ES512 — use JWKS public key
            public_key = _get_es256_key(token)
            if not public_key:
                raise JWTError("Could not fetch JWKS public key for ES256 verification")

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256", "ES384", "ES512"],
                options={"verify_aud": False},
            )
        else:
            # HS256/HS384/HS512 — use shared secret
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256", "HS384", "HS512"],
                options={"verify_aud": False},
            )

        user_metadata = payload.get("user_metadata", {})
        return AuthUser(
            sub=payload["sub"],
            email=payload.get("email"),
            role=user_metadata.get("role"),
            first_name=user_metadata.get("first_name"),
        )
    except (JWTError, Exception) as e:
        logger.warning(f"JWT decode error (alg={token_alg}): {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expire",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """Requires a valid JWT. Returns the authenticated user. Raises 401 if missing/invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
        )
    return _decode_token(credentials.credentials)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthUser]:
    """Returns the authenticated user if a valid token is provided, None otherwise."""
    if not credentials:
        return None
    try:
        return _decode_token(credentials.credentials)
    except HTTPException:
        return None


async def require_admin(
    user: AuthUser = Depends(get_current_user),
) -> AuthUser:
    """Requires the user to have admin role. Raises 403 if not admin."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces reserve aux administrateurs",
        )
    return user
