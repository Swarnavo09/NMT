"""events.json (line events) -> out/cues.json for core/render/srt.py"""
import json, os
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.path.join(H, 'events.json')))['ev']
cues = [{'t0': e['t'], 't1': e['t1'], 'text': e['text']} for e in ev if e['type'] == 'line']
os.makedirs(os.path.join(H, 'out'), exist_ok=True)
json.dump(cues, open(os.path.join(H, 'out', 'cues.json'), 'w'), indent=1, ensure_ascii=False)
print(len(cues), 'cues')
