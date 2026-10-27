smart scroll – how to use

1. adding or editing cards
- open `cards.csv` in vscode
- each row is: `id,type,question,answer`
- `type` must be `chem` or `sat`
- if a question or answer has commas, wrap that field in quotes

2. generating cards.js
- in vscode, open the terminal (view → terminal)
- make sure you are in the project folder
- run: `python generate_cards.py` (or `python3 generate_cards.py`)
- this regenerates `cards.js` from `cards.csv`

3. testing on your computer
- in vscode, right-click `index.html` → “reveal in file explorer” (or finder)
- double-click `index.html` to open it in a browser
- refresh the page after you regenerate `cards.js`

4. updating the online version (github pages)
- in the terminal, run:
  - `git add .`
  - `git commit -m "update cards"`
  - `git push`
- wait about a minute for the site to update

5. using it on your phone
- open your github pages url in your phone browser
- on iphone (safari): share button → “add to home screen”
- on android (chrome): menu (⋮) → “add to home screen”
- tap that icon whenever you feel the doom scroll urge