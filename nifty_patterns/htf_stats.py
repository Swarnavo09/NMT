import pandas as pd, numpy as np
df = pd.read_parquet("/tmp/claude-0/data/nifty_1m.parquet")
d = df.resample("1D").agg({"Open":"first","High":"max","Low":"min","Close":"last"}).dropna()
d["ret"] = d.Close.pct_change()*100
d["gap"] = (d.Open/d.Close.shift()-1)*100
d["oc"] = (d.Close/d.Open-1)*100
d["rng"] = (d.High/d.Low-1)*100
P=lambda *a: print(*a)
P("=== DAILY: days", len(d), "up% close>prev", round((d.ret>0).mean()*100,1), "mean ret", round(d.ret.mean(),3))
P("median daily range %", round(d.rng.median(),2), " median range pts last 2y", round((d.High-d.Low)[-500:].median(),1))
# Month of year
m = df.Close.resample("ME").last().pct_change()*100
g = m.groupby(m.index.month); P("\n=== MONTH OF YEAR (mean%, up%, n)"); P(pd.DataFrame({"mean":g.mean().round(2),"up%":(g.apply(lambda x:(x>0).mean()*100)).round(0),"n":g.size()}).T.to_string())
# Day of week
g = d.groupby(d.index.dayofweek); P("\n=== DAY OF WEEK close-to-close"); P(pd.DataFrame({"mean":g.ret.mean().round(3),"up%":g.ret.apply(lambda x:(x>0).mean()*100).round(1),"range%":g.rng.mean().round(2)}).to_string())
# weekly persistence
w = df.Close.resample("W-FRI").last().pct_change().dropna()*100
P("\n=== WEEKLY up%", round((w>0).mean()*100,1), " P(up | prev up)", round((w[w.shift()>0]>0).mean()*100,1), " P(up | prev down)", round((w[w.shift()<0]>0).mean()*100,1))
mm=m.dropna(); P("MONTHLY up%", round((mm>0).mean()*100,1), " P(up|prev up)",round((mm[mm.shift()>0]>0).mean()*100,1)," P(up|prev dn)",round((mm[mm.shift()<0]>0).mean()*100,1))
# daily persistence
P("DAILY P(up|prev up)", round((d.ret[d.ret.shift()>0]>0).mean()*100,1), " P(up|prev dn)", round((d.ret[d.ret.shift()<0]>0).mean()*100,1))
# Trend filter: close above 20/50 EMA daily -> next-day/next-week
for n in (20,50,200):
    e = d.Close.ewm(span=n).mean(); ab = d.Close>e
    fwd5 = (d.Close.shift(-5)/d.Close-1)*100
    P(f"Daily EMA{n}: above -> fwd5d mean {fwd5[ab].mean():.2f}% up {(fwd5[ab]>0).mean()*100:.0f}% | below -> {fwd5[~ab].mean():.2f}% up {(fwd5[~ab]>0).mean()*100:.0f}%")
# Gaps
P("\n=== GAPS (open vs prev close)")
for lo,hi in [(-9,-0.5),(-0.5,-0.2),(-0.2,0.2),(0.2,0.5),(0.5,9)]:
    s = d[(d.gap>lo)&(d.gap<=hi)].copy()
    filled = np.where(s.gap>0, s.Low<=d.Close.shift().loc[s.index], s.High>=d.Close.shift().loc[s.index])
    P(f"gap ({lo},{hi}] n={len(s):4d} gap-filled same day {filled.mean()*100:4.0f}%  open->close mean {s.oc.mean():+.2f}%  O->C same dir as gap {(np.sign(s.oc)==np.sign(s.gap)).mean()*100:.0f}%")
# Time-of-day
df["r"]=np.log(df.Close).diff(); df.loc[df.index.time==pd.Timestamp("09:15").time(),"r"]=np.nan
tod = df.groupby(df.index.floor("30min").time).r.agg(lambda x: x.abs().mean()*1e4)
P("\n=== avg |1m ret| bps by 30-min slot"); P(tod.round(2).to_string())
# Opening range: does first 15/30/60 min direction predict rest of day?
P("\n=== OPENING RANGE direction vs rest of day")
day = df.groupby(df.index.date)
for mins in (15,30,60):
    end = (pd.Timestamp("09:15")+pd.Timedelta(minutes=mins)).time()
    first = df[df.index.time<end].groupby(df[df.index.time<end].index.date)
    o=first.Open.first(); c=first.Close.last(); fc=day.Close.last()
    f=(c/o-1); rest=(fc/c-1); f,rest=f.align(rest,join="inner")
    P(f"first {mins}m: P(rest same dir) {(np.sign(f)==np.sign(rest)).mean()*100:.1f}%   when |first|>0.3%: {(np.sign(f)==np.sign(rest))[f.abs()>0.003].mean()*100:.1f}% (n={(f.abs()>.003).sum()})")
# expiry day (weekly Thursday until 2025-08-28, Tuesday from 2025-09)
d["dow"]=d.index.dayofweek
exp = ((d.index< "2025-09-01")&(d.dow==3))|((d.index>="2025-09-01")&(d.dow==1))
P(f"\nExpiry days mean range {d.rng[exp].mean():.2f}% vs non-expiry {d.rng[~exp].mean():.2f}%")
d.to_csv("/tmp/claude-0/data/daily.csv")
