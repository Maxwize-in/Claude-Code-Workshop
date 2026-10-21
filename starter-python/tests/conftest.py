"""Point the app at a temp copy of the data so tests never touch data/expenses.json."""
import os
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
tmp = Path(tempfile.mkdtemp(prefix="expenses-")) / "expenses.json"
shutil.copyfile(ROOT / "data" / "expenses.json", tmp)
os.environ["EXPENSES_FILE"] = str(tmp)
sys.path.insert(0, str(ROOT))
