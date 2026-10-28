# generate_sat_verbal_cards.py
import csv
import json
from pathlib import Path

CSV_PATH = Path("sat_verbal_cards.csv")
JS_PATH = Path("sat_verbal_cards.js")


def main():
    rows = []
    if not CSV_PATH.exists():
        raise SystemExit(f"csv file not found: {CSV_PATH}")

    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        expected_fields = [
            "id",
            "skill",
            "contextHtml",
            "question",
            "choiceA",
            "choiceB",
            "choiceC",
            "choiceD",
            "correct",
            "explanation",
        ]

        # sanity check header
        if reader.fieldnames is None:
            raise SystemExit("no header row found in sat_verbal_cards.csv")
        missing = [fld for fld in expected_fields if fld not in reader.fieldnames]
        if missing:
            raise SystemExit(f"csv header is missing columns: {missing}\nfound: {reader.fieldnames}")

        for i, row in enumerate(reader, start=2):  # row 1 is header
            # skip fully empty lines
            if not any(row.values()):
                continue

            try:
                id_raw = row["id"]
                if id_raw is None or id_raw.strip() == "":
                    raise ValueError("empty id")

                card = {
                    "id": int(id_raw),
                    "skill": (row["skill"] or "").strip(),
                    "contextHtml": (row["contextHtml"] or "").strip(),
                    "question": (row["question"] or "").strip(),
                    "choices": [
                        (row["choiceA"] or "").strip(),
                        (row["choiceB"] or "").strip(),
                        (row["choiceC"] or "").strip(),
                        (row["choiceD"] or "").strip(),
                    ],
                    "correct": (row["correct"] or "").strip().upper(),
                    "explanation": (row.get("explanation") or "").strip(),
                }
            except KeyError as e:
                raise SystemExit(f"missing column {e} in row {i}: {row}")
            except ValueError as e:
                raise SystemExit(f"bad value in row {i} ({e}): {row}")

            rows.append(card)

    js = (
        "// AUTO-GENERATED from sat_verbal_cards.csv\n"
        "const SAT_VERBAL_CARDS = "
        + json.dumps(rows, indent=2, ensure_ascii=False)
        + ";\n"
    )
    JS_PATH.write_text(js, encoding="utf-8")
    print(f"wrote {len(rows)} SAT verbal cards to {JS_PATH}")


if __name__ == "__main__":
    main()
