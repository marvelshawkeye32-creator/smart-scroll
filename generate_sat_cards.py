# generate_sat_cards.py
import csv, json
from pathlib import Path

CSV_PATH = Path("sat_cards.csv")
JS_PATH = Path("sat_cards.js")

def main():
    rows = []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(
                {
                    "id": int(row["id"]),
                    "skill": row["skill"].strip(),
                    "question": row["question"].strip(),
                    "choices": [
                        row["choiceA"].strip(),
                        row["choiceB"].strip(),
                        row["choiceC"].strip(),
                        row["choiceD"].strip(),
                    ],
                    "correct": row["correct"].strip().upper(),
                    "explanation": row.get("explanation", "").strip(),
                }
            )

    js = "// AUTO-GENERATED from sat_cards.csv\nconst SAT_CARDS = " + json.dumps(rows, indent=2, ensure_ascii=False) + ";\n"
    JS_PATH.write_text(js, encoding="utf-8")
    print(f"wrote {len(rows)} SAT cards to {JS_PATH}")

if __name__ == "__main__":
    main()
