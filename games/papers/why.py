"""Replay a day log's verdicts offline and name the rules.py line that turned each one to deny.
Usage: python3 why.py runs/day14-HHMM.log 14"""
import ast, collections, re, sys
import rules


def main(log, day):
    kills = collections.Counter()
    for line in open(log):
        m = re.match(r"^(\d+) \('(approve|deny)', (\[.*\])\)$", line.strip())
        if not m: continue
        toks = ast.literal_eval(m[3])
        if toks and isinstance(toks[0], str): print(m[1], "old log: no positions"); continue
        words = [{"t": t, "x": x, "y": y} for t, x, y in toks]
        state = {"ok": None, "line": None}
        def lt(f, e, a):
            ok = f.f_locals.get("ok")
            if ok is False and state["ok"] is not False: state["line"] = f.f_lineno - 1   # the line that just ran
            state["ok"] = ok
            return lt
        sys.settrace(lambda f, e, a: lt if f.f_code.co_name == "verdict" else None)
        v = rules.verdict(words, day); sys.settrace(None)
        print(m[1], "live", m[2], "now", v, "line", state["line"], (rules.__file__ and open(rules.__file__).read().splitlines()[state["line"] - 1].strip()[:90]) if state["line"] else "")
        kills[state["line"]] += 1
    print(kills)


if __name__ == "__main__": main(sys.argv[1], int(sys.argv[2]))
