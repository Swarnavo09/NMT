"""Sita Haran: original score + ambience + foley + voice -> out/mix.wav (48 kHz stereo).
Everything is synthesized here with numpy (no samples). Times come from events.json (exported from film.js)."""
import json, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

LIB = os.environ.get('LIB') or sys.exit('set LIB to the library folder')
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, compress, limit, add, whoosh, thump, pop, click  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
DUR, EV = EVJ['dur'], EVJ['ev']
N = int(DUR * SR) + SR
rng = np.random.default_rng(11)
K = dict(hush=37.6, snap=39.5, lift=42.0, struck=46.6, land=56.0, back=56.6, pull=61.4, legend=64.0)
BEAT = 60 / 96

def buf(): return np.zeros((N, 2))
music, amb, fol, vox = buf(), buf(), buf(), buf()
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

# ------------------------------------------------------------------ instruments
def kalimba(m, v=1.0, d=1.6):
    f, x = mtof(m), t_(d)
    y = np.sin(2 * np.pi * f * x) * np.exp(-x / .55) + .35 * np.sin(2 * np.pi * f * 5.4 * x) * np.exp(-x / .07) + .12 * np.sin(2 * np.pi * f * 2.01 * x) * np.exp(-x / .3)
    y += .2 * hp(noise(d), 3000) * np.exp(-x / .004)
    return y * v * np.minimum(1, x / .002)

def marimba(m, v=1.0, d=1.0):
    f, x = mtof(m), t_(d)
    y = np.sin(2 * np.pi * f * x) * np.exp(-x / .32) + .25 * np.sin(2 * np.pi * f * 3.93 * x) * np.exp(-x / .06) + .08 * np.sin(2 * np.pi * f * 9.2 * x) * np.exp(-x / .02)
    return y * v * np.minimum(1, x / .003)

def glock(m, v=1.0, d=2.0):
    f, x = mtof(m), t_(d)
    return v * (np.sin(2 * np.pi * f * x) * np.exp(-x / .9) + .4 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x / .3) + .2 * np.sin(2 * np.pi * f * 5.4 * x) * np.exp(-x / .12))

def drum(f0=90, v=1.0, d=.6):  # low hand drum
    x = t_(d); f = f0 * (1 + .6 * np.exp(-x / .03))
    return v * (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / .2) + .25 * bp(noise(d), 200, 1200) * np.exp(-x / .02))

def wood(v=1.0, f=1100):
    x = t_(.12); return v * (np.sin(2 * np.pi * f * x) * np.exp(-x / .025) + .3 * bp(noise(.12), 1500, 4000) * np.exp(-x / .006))

def shaker(v=1.0):
    x = t_(.09); e = np.minimum(1, x / .015) * np.exp(-np.maximum(0, x - .015) / .025)
    return v * bp(noise(.09), 5000, 10000) * e

def drone(d, m1=38, m2=45, v=1.0):
    x = t_(d); y = np.zeros_like(x)
    for m, a in [(m1, 1), (m2, .55), (m1 + 12, .25), (m2 + 12, .12)]:
        f = mtof(m); y += a * (np.sin(2 * np.pi * f * x + .3 * np.sin(2 * np.pi * .2 * x)) + .3 * np.sin(4 * np.pi * f * x))
    return lp(y, 900) * v

def place(dst, x, at, g=1.0, pan=0.0): add(dst, x, at, g, pan)
def env_on(x, t0, t1, fi=.5, fo=.5):
    tt = np.arange(len(x)) / SR
    return x * np.clip((tt - t0) / fi, 0, 1)[:, None] * np.clip((t1 - tt) / fo, 0, 1)[:, None] if x.ndim == 2 else x * np.clip((tt - t0) / fi, 0, 1) * np.clip((t1 - tt) / fo, 0, 1)

# ------------------------------------------------------------------ score
D4 = 62
MOTIF = [(69, 0), (66, .5), (62, 1), (64, 1.75)]   # A F# D E: Sita's motif, ends unresolved
def motif(at, v=.5, oct=0):
    for m, b in MOTIF: place(music, kalimba(m + oct, v), at + b * BEAT, 1, -.2 + .1 * (m % 3))

# drone bed (with gaps for the silence)
dr = drone(DUR + 1)
mask = np.ones(len(dr)); tt = np.arange(len(dr)) / SR
mask *= np.clip((tt - 0) / 2, 0, 1)
mask *= np.where(tt < K['hush'], 1, np.where(tt < K['snap'] + 2.5, 0, np.clip((tt - K['snap'] - 2.5) / 2, 0, 1)))
mask *= np.clip((K['hush'] + .2 - tt) / .2, 0, 1) + (tt > K['snap'])
place(music, dr * mask * .09, 0, 1)

# 0-13.7 forest: motif + kalimba arpeggio, shaker from 4.5
motif(.4, .5); motif(4.5, .42); motif(9.8, .42)
arp = [62, 66, 69, 74, 69, 66]
for i, tb in enumerate(np.arange(2.2, 13.6, BEAT)):
    if (i % 8) < 6: place(music, kalimba(arp[i % 6] - 12, .22, 1.2), tb, 1, .3 * np.sin(i))
for tb in np.arange(4.5, 13.7, BEAT / 2): place(music, shaker(.2 + .1 * ((round(tb / BEAT * 2)) % 2 == 0)), tb, 1, .4)
# 13.7-20.6 Lanka: low drum, dark minor second
for tb in np.arange(13.7, 20.6, BEAT * 2): place(music, drum(70, .55), tb, 1, 0); place(music, drum(90, .3), tb + BEAT, 1, .2)
for tb in np.arange(13.9, 20.4, BEAT * 4): place(music, kalimba(50, .35, 2.2), tb, 1, -.3); place(music, kalimba(51, .25, 2.2), tb + BEAT * .5, 1, .3)
# 20.6-37.6 three tricks: marimba ostinato in eighths, layers drop per trick
ost = [62, 69, 66, 69, 64, 69, 66, 71]
for i, tb in enumerate(np.arange(20.6, K['hush'] - .05, BEAT / 2)):
    v = .3 if tb < 26.4 else .26 if tb < 34.7 else .18
    place(music, marimba(ost[i % 8], v), tb, 1, .25 * np.sin(i * .7))
    if tb < 34.7 and i % 2 == 0: place(music, shaker(.18), tb + BEAT / 4, 1, .5)
    if tb < 26.4 and i % 4 == 0: place(music, drum(80, .4), tb, 1, -.1)
for tb in np.arange(20.6, K['hush'] - .05, BEAT * 4): place(music, marimba(50, .35, 1.6), tb, 1, -.2)
# 39.5-53.6 flight: pulse (woodblock eighths + low drum), D minor marimba
fl = [62, 65, 69, 72, 69, 65]
for i, tb in enumerate(np.arange(K['snap'] + 1.1, 53.6, BEAT / 2)):
    place(music, wood(.28 if i % 2 == 0 else .16), tb, 1, .35 if i % 2 else -.35)
    if i % 2 == 0: place(music, drum(65 if i % 4 == 0 else 85, .5), tb, 1, 0)
    if i % 3 == 0: place(music, marimba(fl[(i // 3) % 6], .22), tb, 1, .2)
# falling glide at Jatayu's fall
x = t_(1.4); f = 600 * np.exp(-x * 1.6); place(music, .25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / .9), K['struck'] + .2, 1, 0)
# 53.6-56.6 sea: sparse marimba
for i, tb in enumerate([53.8, 54.8, 55.8]): place(music, marimba([69, 66, 62][i], .26, 1.6), tb, 1, .2 - .2 * i)
# 56.6-61.4 the empty hut: motif alone, unresolved
motif(K['back'] + 2.0, .55)
for e in EV:
    if e['type'] == 'station': place(music, kalimba([62, 66, 69, 74][e['i']], .5, 1.8), e['t'], 1, -.3 + .2 * e['i'])
    if e['type'] == 'ping': place(music, glock(81 + 12 * np.log2(e['p']), .35), e['t'], 1, .3)
place(music, kalimba(38 + 12, .5, 3.5), K['legend'] + .2, 1, 0); place(music, drum(55, .4, 1.5), K['legend'] + .2, 1, 0)

# ------------------------------------------------------------------ ambience beds
def birds(d, dens=.7):
    y = np.zeros(int(d * SR))
    for k in range(int(d * dens)):
        at = rng.uniform(0, d - .5); n = rng.integers(2, 5); f0 = rng.uniform(2400, 3600)
        for j in range(n):
            x = t_(.07); f = f0 * (1 + .25 * np.sin(np.pi * x / .07)); s = int((at + j * .1) * SR)
            c = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / .07) ** 2
            y[s:s + len(c)] += c[:max(0, len(y) - s)] * .5
    return y
def wind(d): return lp(brown(d), 500) * (1 + .5 * np.sin(2 * np.pi * .13 * t_(d)))
def river(d): return bp(noise(d), 400, 1600) * (1 + .3 * np.sin(2 * np.pi * .7 * t_(d)))
def sea(d): x = t_(d); return lp(noise(d), 700) * (.55 + .45 * np.sin(2 * np.pi * .18 * x) ** 2)

def bed(sig, t0, t1, g, fi=1.0, fo=1.0, pan=0.0):
    d = t1 - t0; s = sig(d) if callable(sig) else sig; s = norm(s, 1) * g
    x = np.clip(t_(d) / fi, 0, 1) * np.clip((d - t_(d)) / fo, 0, 1); place(amb, s * x, t0, 1, pan)
bed(lambda d: birds(d, .6), 2.0, K['hush'] - .2, .05, 1.5, .3)
bed(wind, 0, K['hush'], .07, 2, .3)
bed(river, 2.0, K['hush'], .02, 1.5, .3, -.3)
bed(wind, K['snap'] + 1.5, 53.6, .12, 1.5, 1.5)
bed(sea, 52.6, 58.0, .08, 1.0, 1.4)          # J-cut: sea before the coast
bed(lambda d: birds(d, .5), 57.4, 64.0, .045, 1.0, 1.5)
bed(wind, 57.4, DUR, .05, 1.0, 2.0)

# ------------------------------------------------------------------ foley from events
def hoof(v): x = t_(.08); return v * (np.sin(2 * np.pi * 260 * x) * np.exp(-x / .015) + .4 * bp(noise(.08), 800, 3000) * np.exp(-x / .01))
def step_(v): return v * lp(noise(.09), 900) * np.exp(-t_(.09) / .02)
def cry(v):
    x = t_(.9); f = 520 * (1 + .25 * np.sin(np.pi * x / .9)) * (1 + .01 * np.sin(2 * np.pi * 6 * x))
    y = sum(a * np.sin(2 * np.pi * k * np.cumsum(f) / SR) for k, a in [(1, 1), (2, .4), (3, .2)])
    return v * lp(y, 1800) * np.sin(np.pi * x / .9) ** .6 * .5
def scratch(d): x = t_(d); return bp(noise(d), 2000, 6000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 7 * x))) * np.clip(x / .05, 0, 1) * np.clip((d - x) / .1, 0, 1)
def snap(v):
    x = t_(.6); return v * (bp(noise(.6), 1500, 7000) * np.exp(-x / .03) + .6 * np.sin(2 * np.pi * 180 * x) * np.exp(-x / .08) + .3 * np.sin(2 * np.pi * 1320 * x) * np.exp(-x / .25))
def reveal(v):
    x = t_(1.0); return v * (lp(noise(1.0), 300) * np.exp(-x / .25) * .8 + np.sin(2 * np.pi * 55 * x) * np.exp(-x / .5))
def flap(v): x = t_(.2); return v * lp(noise(.2), 600) * np.sin(np.pi * x / .2) ** 2
def caw(v):
    x = t_(.5); f = 900 * (1 - .3 * x / .5)
    return v * bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3, 600, 3000) * np.sin(np.pi * x / .5)
def slash(v): x = t_(.35); return v * hp(noise(.35), 2500) * np.exp(-x / .07)
def chime(v): return v * (glock(86, .5) + glock(93, .3))
def tick(v, p=1.0): return click(p, v) if True else 0

for e in EV:
    t, ty, v = e['t'], e['type'], e.get('v', 1.0)
    if ty == 'thunk': place(fol, thump(v * .8, 110), t, .5)
    elif ty == 'pop': place(fol, pop(v), t, .35, rng.uniform(-.5, .5))
    elif ty == 'pip': place(fol, pop(v), t, .3)
    elif ty == 'tick': place(fol, click(e.get('p', 1.0), v), t, .35)
    elif ty == 'whoosh': place(fol, whoosh(.45, v), t, .5)
    elif ty == 'card': place(fol, click(.8, .6), t, .3); place(fol, click(1.2, .4), t + .06, .25)
    elif ty == 'chime': place(fol, chime(v), t, .6, .3)
    elif ty == 'hoof': place(fol, hoof(v), t, .6, .3)
    elif ty == 'step': place(fol, step_(v), t, .8, -.1)
    elif ty == 'cry': place(fol, cry(v), t, .35, .4)
    elif ty == 'scratch': place(fol, scratch(e['d']), t, .06, 0)
    elif ty == 'in': place(fol, kalimba(74, .35), t, .8)
    elif ty == 'out': place(fol, click(.6, .5), t, .3)
    elif ty == 'snap': place(fol, snap(v), t, .9)
    elif ty == 'reveal': place(fol, reveal(v), t, .7)
    elif ty == 'thud': place(fol, thump(v, e.get('f', 70)), t, .7)
    elif ty == 'lift': place(fol, whoosh(1.2, v), t, .6)
    elif ty == 'cawl': place(fol, caw(v), t, .3, -.3)
    elif ty == 'flap': place(fol, flap(v), t, .6, -.2)
    elif ty == 'slash': place(fol, slash(v), t, .6)

# ------------------------------------------------------------------ voice
for e in EV:
    if e['type'] != 'line': continue
    w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'), dtype='float32')
    if w.ndim > 1: w = w.mean(1)
    w = resample_poly(w, SR, sr) if sr != SR else w
    w = compress(norm(w, .9), .3, 3.0)
    place(vox, w, e['t'], .55, 0)

# ------------------------------------------------------------------ ducking + master
v_env = np.abs(vox[:, 0])
from scipy.ndimage import maximum_filter1d, uniform_filter1d
v_env = uniform_filter1d(maximum_filter1d(v_env, int(.15 * SR)), int(.12 * SR))
act = np.clip(v_env / .04, 0, 1)
duck_m = 10 ** (-8 * act / 20); duck_a = 10 ** (-7 * act / 20)
music *= .3; amb *= 1.8; fol *= .6; vox *= 1.8
mix = music * duck_m[:, None] + amb * duck_a[:, None] + fol + vox
# digital silence before the snap: only voice and Sita's steps
tt = np.arange(N) / SR
sil = (tt > K['hush'] + .2) & (tt < K['snap'] - .01)
mix[sil] = (fol + vox)[sil]
mix = mix[:int(DUR * SR)]
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
print('out/mix.wav', round(len(mix) / SR, 2), 's, peak', round(float(np.abs(mix).max()), 3))
if os.environ.get('STEMS'):
    for name, s in [('music', music * duck_m[:, None]), ('amb', amb * duck_a[:, None]), ('fol', fol), ('vox', vox)]:
        r = lambda a, b: 20 * np.log10(np.sqrt(np.mean(s[int(a * SR):int(b * SR)] ** 2)) + 1e-9)
        print(f"{name:6s} speech 5-8: {r(5, 8):6.1f}  dB  | 21-25: {r(21, 25):6.1f} | flight 46-48: {r(46, 48):6.1f} | 61-64: {r(61.5, 64):6.1f}")
