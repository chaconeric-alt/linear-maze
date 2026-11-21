#!/usr/bin/env python3
"""Run the self-test baseline (tests/baseline.txt) the repeatable way and say how it went.

Every run is started as   godot --headless --fixed-fps 60 --path maze3d -- <its arguments>
and --selftest is repeatable by default (a fixed seed and the clock counted in frames), so with --fixed-fps 60 a run
prints the same lines every time. Two runs of different code can then be compared line for line: --compare.

    python tests/run_baseline.py                       all of it; logs in tests/out/<name>.log
    python tests/run_baseline.py gen5 deep             only those
    python tests/run_baseline.py --jobs 2              two at a time (Staff Only is always run on its own)
    python tests/run_baseline.py --out before          logs in tests/out/before/ (keep a run to compare with)
    python tests/run_baseline.py --compare before      then say which checks differ from that run
    python tests/run_baseline.py --godot "C:/Godot/Godot_v4.7.2.exe"     (or set GODOT; default: godot on the PATH)

Exit status: the number of runs with a failed check, a script error or no result line.
"""
import argparse
import concurrent.futures
import os
import re
import shutil
import subprocess
import sys
import time

TESTS = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(TESTS)                      # the maze3d folder (Godot's --path)
HEAVY = {"staffonly"}                              # about 3 GB each: never two at once
KEEP = re.compile(r"^(PASS|FAIL|INFO|RESULT)")     # the lines a run is judged and compared by


def read_baseline(path):
    runs = []
    for line in open(path, encoding="utf-8"):
        line = line.split("#", 1)[0].strip()
        if "|" in line:
            name, args = line.split("|", 1)
            runs.append((name.strip(), args.split()))
    return runs


def run_one(godot, name, args, out_dir, timeout):
    log = os.path.join(out_dir, name + ".log")
    cmd = [godot, "--headless", "--fixed-fps", "60", "--path", GAME, "--"] + args
    start = time.time()
    try:
        with open(log, "w", encoding="utf-8", errors="replace") as f:
            subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, timeout=timeout)
    except subprocess.TimeoutExpired:
        with open(log, "a", encoding="utf-8") as f:
            f.write("\nTIMED OUT after %d s\n" % timeout)
    return name, time.time() - start, summarise(log)


def summarise(log):
    text = open(log, encoding="utf-8", errors="replace").read() if os.path.exists(log) else ""
    lines = text.splitlines()
    result = next((l for l in lines if l.startswith("RESULT")), "")
    return {
        "checks": sum(1 for l in lines if l.startswith(("PASS", "FAIL"))),
        "fails": [l for l in lines if l.startswith("FAIL")],
        "errors": sum(1 for l in lines if "SCRIPT ERROR" in l),
        "result": result,
        "ok": bool(result) and result.split()[1:2] == ["0"] and "SCRIPT ERROR" not in text,
    }


def compare(name, out_dir, ref_dir):
    """Lines (PASS, FAIL, INFO, RESULT) only in the reference run (-) or only in this one (+)."""
    def kept(d):
        p = os.path.join(d, name + ".log")
        if not os.path.exists(p):
            return None
        return [l.rstrip() for l in open(p, encoding="utf-8", errors="replace") if KEEP.match(l)]
    a, b = kept(ref_dir), kept(out_dir)
    if a is None:
        return ["  (no run of %s in %s to compare with)" % (name, ref_dir)]
    import difflib
    return ["  " + l for l in difflib.unified_diff(a, b, lineterm="", n=0) if l[:1] in "+-" and not l.startswith(("+++", "---"))]


def main():
    ap = argparse.ArgumentParser(description="Run the maze3d self-test baseline, repeatably.")
    ap.add_argument("only", nargs="*", help="names from tests/baseline.txt (default: all)")
    ap.add_argument("--godot", default=os.environ.get("GODOT", "godot"), help="the Godot executable (default: $GODOT or godot)")
    ap.add_argument("--jobs", type=int, default=1, help="runs at once (Staff Only always alone)")
    ap.add_argument("--out", default="", help="folder under tests/out for the logs")
    ap.add_argument("--compare", default="", help="folder under tests/out of an earlier run to compare with")
    ap.add_argument("--timeout", type=int, default=2400, help="seconds before a run is given up")
    ap.add_argument("--baseline", default=os.path.join(TESTS, "baseline.txt"))
    o = ap.parse_args()

    if shutil.which(o.godot) is None and not os.path.exists(o.godot):
        sys.exit("Godot not found: %s (give --godot or set GODOT)" % o.godot)
    runs = read_baseline(o.baseline)
    if o.only:
        unknown = [n for n in o.only if n not in {r[0] for r in runs}]
        if unknown:
            sys.exit("not in %s: %s" % (o.baseline, ", ".join(unknown)))
        runs = [r for r in runs if r[0] in o.only]
    out_root = os.path.join(TESTS, "out")
    out_dir = os.path.join(out_root, o.out) if o.out else out_root
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_root, ".gdignore"), "w").close()      # keeps Godot from looking in here

    done = []
    light = [r for r in runs if r[0] not in HEAVY]
    heavy = [r for r in runs if r[0] in HEAVY]
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, o.jobs)) as pool:
        for fut in concurrent.futures.as_completed([pool.submit(run_one, o.godot, n, a, out_dir, o.timeout) for n, a in light]):
            done.append(fut.result())
            report(done[-1], o, out_dir, out_root)
    for n, a in heavy:
        done.append(run_one(o.godot, n, a, out_dir, o.timeout))
        report(done[-1], o, out_dir, out_root)

    bad = [d for d in done if not d[2]["ok"]]
    print("\n%d runs, %d checks, %d with a failure or an error. Logs: %s" % (len(done), sum(d[2]["checks"] for d in done), len(bad), out_dir))
    return len(bad)


def report(d, o, out_dir, out_root):
    name, secs, s = d
    print("%-4s %-16s %4d checks  %-22s %d script errors  %4.0f s" % ("ok" if s["ok"] else "BAD", name, s["checks"], s["result"] or "(no result)", s["errors"], secs))
    for f in s["fails"]:
        print("       " + f)
    if o.compare:
        diff = compare(name, out_dir, os.path.join(out_root, o.compare))
        print("       same as %s" % o.compare if not diff else "       differs from %s:\n%s" % (o.compare, "\n".join("     " + l for l in diff)))
    sys.stdout.flush()


if __name__ == "__main__":
    sys.exit(main())
