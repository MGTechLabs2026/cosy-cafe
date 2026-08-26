"""Generate Moonleaf Café placeholder SFX (M0 smoke-test sounds).

Synthesizes tiny warm UI sounds as WAV; ffmpeg converts to OGG/MP3 after.
Run: python3 tools/gen_sfx.py
"""
import math
import random
import struct
import wave

SR = 44100


def write_wav(path, samples):
    frames = b"".join(
        struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples
    )
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(frames)


def bell(freq, dur, vol=0.5, partials=((1.0, 1.0), (2.76, 0.35), (5.4, 0.12))):
    """Bell-ish tone with inharmonic partials and exponential decay."""
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-4.5 * t / dur)
        s = sum(a * math.sin(2 * math.pi * freq * m * t) for m, a in partials)
        # 3 ms attack to avoid a click at sample 0
        att = min(1.0, t / 0.003)
        out.append(vol * env * att * s / len(partials))
    return out


def door_chime():
    """Two-note shop bell: E6 then G6, overlapping ring-out."""
    first = bell(1318.5, 0.9, vol=0.42)
    second = bell(1568.0, 1.1, vol=0.46)
    delay = int(SR * 0.16)
    n = max(len(first), len(second) + delay)
    mix = [0.0] * n
    for i, s in enumerate(first):
        mix[i] += s
    for i, s in enumerate(second):
        mix[delay + i] += s
    peak = max(abs(x) for x in mix) or 1.0
    return [x / peak * 0.85 for x in mix]


def click():
    """Soft woody tick: fast-decaying damped sine + a whisper of noise."""
    dur = 0.06
    n = int(SR * dur)
    rnd = random.Random(7)
    out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-90 * t)
        tone = math.sin(2 * math.pi * 2100 * t) + 0.5 * math.sin(2 * math.pi * 3400 * t)
        noise = (rnd.random() * 2 - 1) * 0.15 * math.exp(-160 * t)
        att = min(1.0, t / 0.001)
        out.append(0.55 * env * att * (tone / 1.5 + noise))
    return out


if __name__ == "__main__":
    import os

    os.makedirs("public/audio", exist_ok=True)
    write_wav("public/audio/door-chime.wav", door_chime())
    write_wav("public/audio/click.wav", click())
    print("wrote public/audio/door-chime.wav and public/audio/click.wav")
