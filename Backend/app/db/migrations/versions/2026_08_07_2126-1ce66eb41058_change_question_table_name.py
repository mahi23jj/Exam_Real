"""change question table name 

Revision ID: 1ce66eb41058
Revises: '0009_questions_replies.py'
Create Date: 2026-08-07 21:26:25.695033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '1ce66eb41058'
down_revision: Union[str, None] = '0009_questions_replies.py'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
