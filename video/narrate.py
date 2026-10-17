"""
Narration and timeline for the LastBuy video.

    python video/narrate.py          (needs edge-tts: pip install edge-tts)

Reads video/script.json and, for each part:

  1. speaks the narration with a Microsoft neural voice, saving the audio and
     the time of every word;
  2. finds each shot's "from" phrase and each cue's "at" phrase in those words,
     so a frame changes, and a box lights up, as the words are said.

Writes video/src/timeline.json for Remotion, copies the frames and logos it
needs into video/public/, and writes submission/LastBuy-demo.srt from the same
word timings.

The voice is an online service: the narration text is sent to Microsoft to be
spoken. Nothing else is.
"""
import asyncio
import json
import re
import shutil
from pathlib import Path

import edge_tts

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PUBLIC = HERE / "public"
SHOTS = ROOT / "submission" / "screenshots"
ASSETS = ROOT / "submission" / "assets"

FPS = 30
LEAD_IN = 0.8  # black, then the first frame, before the first word
GAP = 0.75  # breath between parts
SHOT_LEAD = 0.3  # a frame arrives just before the words about it
FIRST_SHOT_LEAD = 0.45
CUE_LEAD = 0.12
CUE_MAX = 3.6  # a highlight lets go after this long if nothing replaces it
CUE_MIN = 1.0
END_HOLD = 2.8  # on the end card after the last word

# The voice needs some words spelled out; the subtitles should not.
DISPLAY = {
    "A-D-U-M twelve-oh-one A-R-Z": "ADUM1201ARZ",
    "Miner U": "MinerU",
    "Last Buy": "LastBuy",
}

# edge-tts sends audio-24khz-48kbitrate-mono-mp3: constant bit rate, so the
# length is the size over the rate.
MP3_BYTES_PER_SECOND = 48_000 / 8


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


class Words:
    """Spoken words with times, searchable by phrase."""

    def __init__(self, words):
        self.words = words  # [(text, start, end)]
        self.flat = ""
        self.owner = []  # character index -> word index
        self.begins = []  # word index -> its first character
        for i, (w, _, _) in enumerate(words):
            n = norm(w)
            self.begins.append(len(self.flat))
            self.flat += n
            self.owner += [i] * len(n)

    def find(self, phrase: str, after: int = 0):
        """(start time, end time, index of the word after the phrase)."""
        n = norm(phrase)
        start_char = self.begins[after] if after < len(self.words) else len(self.flat)
        at = self.flat.find(n, start_char)
        if at < 0:
            raise SystemExit(f'phrase not found in narration: "{phrase}"')
        first = self.owner[at]
        last = self.owner[at + len(n) - 1]
        return self.words[first][1], self.words[last][2], last + 1


async def speak(text: str, voice: str, rate: str, out: Path):
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with out.open("wb") as f:
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 1e7
                words.append((chunk["text"], s, s + chunk["duration"] / 1e7))
    return words


def chunks_for_subtitles(text: str):
    """Sentences, with long ones split at commas, each at most ~44 characters."""
    out = []
    for sentence in re.findall(r"[^.?!]+[.?!]", text):
        sentence = sentence.strip()
        if len(sentence) <= 44:
            out.append(sentence)
            continue
        line = ""
        for piece in re.split(r"(?<=,)\s+", sentence):
            if line and len(line) + 1 + len(piece) > 44:
                out.append(line)
                line = piece
            else:
                line = f"{line} {piece}".strip()
        if line:
            out.append(line)
    return out


def display(s: str) -> str:
    for spoken, shown in DISPLAY.items():
        s = s.replace(spoken, shown)
    return s


def srt_time(t: float) -> str:
    ms = round(t * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


async def main():
    script = json.loads((HERE / "script.json").read_text(encoding="utf-8"))
    (PUBLIC / "audio").mkdir(parents=True, exist_ok=True)
    (PUBLIC / "frames").mkdir(parents=True, exist_ok=True)
    (PUBLIC / "assets").mkdir(parents=True, exist_ok=True)

    for f in ["logo-white.png", "logo-amd.png", "logo-gemma.png", "logo-evolus.png"]:
        shutil.copy(ASSETS / f, PUBLIC / "assets" / f)

    parts, shots, subs = [], [], []
    t = LEAD_IN
    for p in script["parts"]:
        audio = PUBLIC / "audio" / f"{p['id']}.mp3"
        words = await speak(p["text"], script["voice"], script["rate"], audio)
        length = audio.stat().st_size / MP3_BYTES_PER_SECOND
        w = Words(words)
        print(f"  {p['id']:<8} {length:5.1f}s  {len(words)} words")
        parts.append({"id": p["id"], "audio": f"audio/{p['id']}.mp3", "start": round(t, 3), "duration": round(length, 3)})

        # frames: the first arrives a moment before the part starts speaking
        cursor = 0
        part_shots = []
        for i, s in enumerate(p["shots"]):
            if i == 0:
                # the very first frame is up from the start, under the fade-in
                start = 0.0 if not shots else t - FIRST_SHOT_LEAD
            else:
                ps, _, cursor = w.find(s["from"], cursor)
                start = t + ps - SHOT_LEAD
            if s["image"] != "endcard":
                shutil.copy(SHOTS / s["image"], PUBLIC / "frames" / s["image"])
            part_shots.append({"image": s["image"], "dark": bool(s.get("dark")), "start": round(start, 3), "cues": []})

        # highlights, in the order they are spoken
        cursor = 0
        cues = []
        for c in p["cues"]:
            cs, _, cursor = w.find(c["at"], cursor)
            cues.append({"start": t + cs - CUE_LEAD, "box": c["box"]})
        for i, c in enumerate(cues):
            nxt = cues[i + 1]["start"] if i + 1 < len(cues) else None
            end = c["start"] + CUE_MAX
            if nxt is not None:
                end = min(end, nxt)
            c["end"] = max(end, c["start"] + CUE_MIN)
            # each cue belongs to the shot on screen when it starts
            owner = [s for s in part_shots if s["start"] <= c["start"] + 1e-6][-1]
            owner["cues"].append({"start": round(c["start"], 3), "end": round(c["end"], 3), "box": c["box"]})

        shots += part_shots

        # subtitles from the same timings
        cursor = 0
        for line in chunks_for_subtitles(p["text"]):
            ls, le, cursor = w.find(line, cursor)
            subs.append((t + ls, t + le, display(line)))

        t += length + GAP

    end = t - GAP + END_HOLD
    for i, s in enumerate(shots):
        s["end"] = shots[i + 1]["start"] if i + 1 < len(shots) else round(end, 3)
        for c in s["cues"]:
            c["end"] = min(c["end"], s["end"])

    timeline = {
        "fps": FPS,
        "durationInFrames": round(end * FPS),
        "parts": parts,
        "shots": shots,
    }
    (HERE / "src").mkdir(exist_ok=True)
    (HERE / "src" / "timeline.json").write_text(json.dumps(timeline, indent=2), encoding="utf-8")

    srt = []
    for i, (a, b, text) in enumerate(subs, 1):
        srt.append(f"{i}\n{srt_time(a)} --> {srt_time(b + 0.25)}\n{text}\n")
    (ROOT / "submission" / "LastBuy-demo.srt").write_text("\n".join(srt), encoding="utf-8")

    print(f"total {end:.1f}s, {len(shots)} shots, {sum(len(s['cues']) for s in shots)} highlights, {len(subs)} subtitles")


if __name__ == "__main__":
    asyncio.run(main())
