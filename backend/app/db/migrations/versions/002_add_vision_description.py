"""Add vision_description column to sources

Revision ID: 002_add_vision_description
Revises: 001_initial
Create Date: 2024-04-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '002_add_vision_description'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sources', sa.Column('vision_description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('sources', 'vision_description')
