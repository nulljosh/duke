"""New game through the naming screen: boy, named STITCH. Steps come from pokeruby's main_menu.c
and naming_screen.c, so each press waits for the task that takes it."""
from pk import GBA

NAME = "STITCH"
# Upper page of the English keyboard (naming_screen.c sKeyboardCharacters): cursor (x, y) per letter.
ROWS = ["ABCDEF.", "GHIJKL,", "MNOPQRS", "TUVWXYZ"]


def until(g, task, key="A", limit=200):
    for _ in range(limit):
        if task in g.tasks():
            return
        g.press(key, after=20)
    raise SystemExit(f"never reached {task}: {g.screen()} {g.tasks()}")


def text(s):
    return bytes(0xBB + ord(c) - ord("A") for c in s)


def main():
    g = GBA()
    until(g, "Task_NewGameSpeech16")          # gender menu, cursor starts on BOY
    g.shot("gender")
    g.press("A", after=30)
    until(g, "Task_NewGameSpeech21")          # name menu, cursor starts on NEW NAME
    g.shot("name-menu")
    g.press("A", after=60)
    for _ in range(100):
        if "Naming" in g.screen():
            break
        g.wait(10)
    g.wait(60)
    g.press("B", after=8)                      # Task_NewGameSpeech22 pre-fills a preset name
    for _ in range(7):
        g.press("B", after=8)
    x = y = 0
    for c in NAME:
        ty = next(i for i, r in enumerate(ROWS) if c in r)
        tx = ROWS[ty].index(c)
        while x < tx: g.press("RIGHT", after=6); x += 1
        while x > tx: g.press("LEFT", after=6); x -= 1
        while y < ty: g.press("DOWN", after=6); y += 1
        while y > ty: g.press("UP", after=6); y -= 1
        g.press("A", after=10)
    g.shot("named")
    g.press("START", after=20)                 # cursor to OK
    g.press("A", after=120)
    name = g.read(0x02024EA4, 7)               # gSaveBlock2.playerName
    gender = g.r8(0x02024EA4 + 8)              # gSaveBlock2.playerGender, 0 = male
    print("name", name.hex(), "want", text(NAME).hex(), "gender", gender)
    g.shot("after-name")


if __name__ == "__main__":
    main()
