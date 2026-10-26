# generate_cards.py
# run this to turn cards.csv into cards.js

import csv
import json
from pathlib import Path

CSV_PATH = Path("cards.csv")
JS_PATH = Path("cards.js")

def read_cards_from_csv(path: Path):
    cards = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # basic cleanup
            card_id = int(row["id"])
            card_type = row["type"].strip().lower()
            if card_type not in ("chem", "sat"):
                raise ValueError(f"invalid type '{card_type}' for id {card_id} (must be 'chem' or 'sat')")
            question = row["question"].strip()
            answer = row["answer"].strip()

            cards.append(
                {
                    "id": card_id,
                    "type": card_type,
                    "question": question,
                    "answer": answer,
                }
            )
    return cards

def write_cards_js(cards, path: Path):
    # pretty json, but we want valid js: const CARDS = [...]
    json_str = json.dumps(cards, indent=2, ensure_ascii=False)
    js_content = f"// AUTO-GENERATED from cards.csv. do not edit by hand.\nconst CARDS = {json_str};\n"
    path.write_text(js_content, encoding="utf-8")
    print(f"wrote {len(cards)} cards to {path.name}")

def main():
    if not CSV_PATH.exists():
        raise SystemExit(f"csv file not found: {CSV_PATH}")
    cards = read_cards_from_csv(CSV_PATH)
    if not cards:
        print("warning: no cards found in csv.")
    write_cards_js(cards, JS_PATH)

if __name__ == "__main__":
    main()
