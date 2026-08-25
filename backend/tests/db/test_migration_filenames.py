"""FR-107: generated migration filenames must be date-prefixed and readable.

Reading `file_template` back out of `alembic.ini` would only restate the
config file. This test instead runs Alembic's real `revision` command against
a throwaway versions directory and asserts the filename it actually produces,
so a future edit to `file_template` that breaks the convention fails here.

`alembic revision` without `--autogenerate` does not load `alembic/env.py`
(`revision_environment` is off), so no database connection is involved.
"""

import re
from pathlib import Path

from alembic.config import Config

from alembic import command

_BACKEND_ROOT = Path(__file__).resolve().parents[2]

# FR-107's canonical shape: `YYYY-MM-DD_<slugified message>.py`.
_EXPECTED_FILENAME = re.compile(r"\d{4}-\d{2}-\d{2}_add_probe_table\.py")


def test_generated_revision_filename_is_date_prefixed(tmp_path: Path) -> None:
    config = Config(str(_BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(_BACKEND_ROOT / "alembic"))
    config.set_main_option("version_locations", str(tmp_path))

    command.revision(config, message="add probe table")

    generated = list(tmp_path.glob("*.py"))
    assert len(generated) == 1
    assert _EXPECTED_FILENAME.fullmatch(generated[0].name)
