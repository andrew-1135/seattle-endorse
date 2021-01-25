import os
import shutil

UNUSED_FILES = [
    "main.js",
]
UNUSED_DIRS = [
    "_snowpack",
    "test",
]

def main():
    for uf in UNUSED_FILES:
        os.remove(f"build/{uf}")

    for ud in UNUSED_DIRS:
        shutil.rmtree(f"build/{ud}")

if __name__ == "__main__":
    main()
