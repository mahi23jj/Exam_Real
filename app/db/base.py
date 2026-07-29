import uuid
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel
from datetime import datetime, UTC


def generate_uuid() -> uuid.UUID:
    return uuid.uuid4()




def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


class TimestampMixin(SQLModel):
    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"index": True}
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        sa_column_kwargs={"onupdate": utc_now}
    )
