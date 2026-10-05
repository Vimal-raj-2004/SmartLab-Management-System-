import re
import urllib.parse
from sqlalchemy import create_engine, TypeDecorator, String, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings


def sanitize_database_url(url: str) -> str:
    """
    Sanitizes database URLs, automatically handling:
    - Bracketed passwords like [my_password@123] from dashboard templates
    - URL-encoding special characters in the password part (e.g. '@', '%', etc.)
    """
    if not url or url.startswith("sqlite"):
        return url

    match = re.match(r"^(?P<scheme>[^:]+://)(?P<user>[^:]+):(?P<rest>.+)$", url)
    if not match:
        return url

    scheme = match.group("scheme")
    user = match.group("user")
    rest = match.group("rest")

    if "@" in rest:
        # The last '@' separates password from hostname
        last_at = rest.rfind("@")
        raw_password = rest[:last_at]
        host_part = rest[last_at + 1:]

        # Strip user-typed brackets [password]
        if raw_password.startswith("[") and raw_password.endswith("]"):
            raw_password = raw_password[1:-1]

        # URL-decode first if already partially encoded, then encode properly
        unquoted = urllib.parse.unquote(raw_password)
        encoded_password = urllib.parse.quote(unquoted, safe="")
        return f"{scheme}{user}:{encoded_password}@{host_part}"

    return url


def create_resilient_engine():
    """
    Attempts to connect to configured DATABASE_URL (Supabase PostgreSQL).
    If unreachable due to DNS failure, offline status, or network drop,
    it automatically falls back to local SQLite so the application never crashes.
    """
    configured_url = sanitize_database_url(settings.DATABASE_URL)

    if not configured_url.startswith("sqlite"):
        try:
            # Quick probe and resilient engine with pool recycling and TCP keepalives
            test_engine = create_engine(
                configured_url,
                connect_args={
                    "connect_timeout": 10,
                    "keepalives": 1,
                    "keepalives_idle": 30,
                    "keepalives_interval": 10,
                    "keepalives_count": 5
                },
                pool_pre_ping=True,
                pool_recycle=300,
                pool_size=10,
                max_overflow=20
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            host_display = configured_url.split("@")[-1] if "@" in configured_url else configured_url
            print(f"[DATABASE] Connected to PostgreSQL: {host_display}")
            return test_engine
        except Exception as exc:
            print(f"[DATABASE WARNING] Unable to connect to remote database ({exc.__class__.__name__}: {exc})")
            print(f"[DATABASE WARNING] Switching to local SQLite fallback (sqlite:///./lab_management.db)")
            return create_engine(
                "sqlite:///./lab_management.db",
                connect_args={"check_same_thread": False},
                pool_pre_ping=True
            )
    else:
        return create_engine(
            configured_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )


engine = create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FlexibleEnum(TypeDecorator):
    """
    Robust Enum column type that accepts both uppercase Enum member names ('ACTIVE')
    and lowercase Enum values ('active') case-insensitively from PostgreSQL and SQLite.
    Stores and serializes as clean enum values.
    """
    impl = String(50)
    cache_ok = True

    def __init__(self, enum_cls, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_cls = enum_cls

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_cls):
            return value.value
        val_str = str(value).strip().lower()
        for member in self.enum_cls:
            if member.value.lower() == val_str or member.name.lower() == val_str:
                return member.value
        return val_str

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        val_str = str(value).strip().lower()
        for member in self.enum_cls:
            if member.value.lower() == val_str or member.name.lower() == val_str:
                return member
        return list(self.enum_cls)[0]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
