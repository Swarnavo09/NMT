"""Refine the narrow-opening-range breakout + measure range-day (option selling) conditions."""
import pandas as pd, numpy as np
COST=1.5
df = pd.read_parquet("/tmp/claude-0/data/nifty_1m.parquet")
d = df.resample("1D").agg({"Open":"first","High":"max","Low":"min","Close":"last"}).dropna()
d["pc"]=d.Close.shift()
tr = pd.concat([d.High-d.Low,(d.High-d.pc).abs(),(d.Low-d.pc).abs()],axis=1).max(axis=1)
d["atr"]=tr.rolling(14).mean().shift()
d["e20"]=d.Close.ewm(span=20,adjust=False).mean().shift()
w=df.Close.resample("W-FRI").last(); d["wk_up"]=(w>w.ewm(span=10,adjust=False).mean()).reindex(d.index,method="ffill").shift()
d["nr4"] = ((d.High-d.Low).shift() <= (d.High-d.Low).shift().rolling(4).min())  # yesterday was narrowest of 4 days
d["dow"]=d.index.dayofweek
d["expiry"]=((d.index<"2025-09-01")&(d.dow==3))|((d.index>="2025-09-01")&(d.dow==1))
def mk(tf): return df.resample(tf, origin="start_day", offset="9h15min").agg({"Open":"first","High":"max","Low":"min","Close":"last"}).dropna()
B={tf:{k:v for k,v in mk(tf).groupby(mk(tf).index.date)} for tf in ("5min","10min","15min")}
B1={k:v for k,v in df.groupby(df.index.date)}
def sim(m, i_time, side, entry, stop, tgt=None, exit_time="15:20", trail=None):
    """simulate on 1-min bars after entry time (precise)."""
    m=m[m.index>=i_time]; best=entry
    for t,(h,l,c) in zip(m.index, m[["High","Low","Close"]].values):
        if side>0:
            if l<=stop: return (stop/entry-1)*1e4
            if tgt and h>=tgt: return (tgt/entry-1)*1e4
            if trail: best=max(best,h); stop=max(stop,best-trail)
        else:
            if h>=stop: return (entry/stop-1)*1e4
            if tgt and l<=tgt: return (entry/tgt-1)*1e4
            if trail: best=min(best,l); stop=min(stop,best+trail)
        if t.strftime("%H:%M")>=exit_time: return side*(c/entry-1)*1e4
    return side*(m.Close.iat[-1]/entry-1)*1e4
def orb(OR=30, narrow=0.3, tf="5min", stopmode="opp", last_entry="12:00", filt=None, tgt_atr=None, trail_atr=None, exit_time="15:20"):
    out=[]
    for dt,bars in B[tf].items():
        k=str(dt)
        if k not in d.index: continue
        dd=d.loc[k]
        if np.isnan(dd.atr): continue
        m1=B1[dt]; orr=m1[m1.index<m1.index[0]+pd.Timedelta(minutes=OR)]
        hi,lo=orr.High.max(),orr.Low.min(); rng=hi-lo
        if narrow and rng>narrow*dd.atr: continue
        if filt=="nr4" and not dd.nr4: continue
        if filt=="noexp" and dd.expiry: continue
        sub=bars[bars.index>=m1.index[0]+pd.Timedelta(minutes=OR)]
        step=pd.Timedelta(tf)
        for t,c in zip(sub.index, sub.Close.values):
            if t.strftime("%H:%M")>last_entry: break
            side=1 if c>hi else (-1 if c<lo else 0)
            if side==0: continue
            if filt=="wk" and dd.wk_up==dd.wk_up and (side>0)!=bool(dd.wk_up): break
            if filt=="d20" and (side>0)!=(dd.pc>dd.e20): break
            stop = (lo if side>0 else hi) if stopmode=="opp" else (hi+lo)/2
            tgt = c+side*tgt_atr*dd.atr if tgt_atr else None
            r=sim(m1, t+step, side, c, stop, tgt, exit_time, trail_atr*dd.atr if trail_atr else None)
            out.append((dt,side,r,rng/dd.atr)); break
    t=pd.DataFrame(out,columns=["date","side","r","orx"]); t["date"]=pd.to_datetime(t.date); t["net"]=t.r-COST
    return t
def stats(t):
    s=t.net; eq=s.cumsum(); pf=s[s>0].sum()/max(1e-9,-s[s<0].sum())
    return f"n={len(s):4d} win={(s>0).mean()*100:4.1f}% avg={s.mean():+5.2f}bp PF={pf:4.2f} maxDD={(eq-eq.cummax()).min():6.0f}"
def rep(name,t):
    print(f"{name:48s} IS {stats(t[t.date<'2021'])} | OOS {stats(t[t.date>='2021'])}")
    return t
print("### sensitivity: narrow threshold (OR=30, 5m close entry, stop=opposite side, exit 15:20)")
for nw in (0.2,0.25,0.3,0.35,0.4,0.5,None): rep(f"narrow<{nw}",orb(narrow=nw))
print("### opening range length")
for OR in (15,30,45,60): rep(f"OR={OR}m narrow<0.3",orb(OR=OR))
print("### confirmation candle timeframe")
for tf in ("5min","10min","15min"): rep(f"tf={tf}",orb(tf=tf))
print("### stop placement / exits")
rep("stop=OR mid",orb(stopmode="mid"))
rep("target 1.0 ATR",orb(tgt_atr=1.0))
rep("target 0.7 ATR",orb(tgt_atr=0.7))
rep("trail 0.4 ATR",orb(trail_atr=0.4))
rep("trail 0.6 ATR",orb(trail_atr=0.6))
rep("exit 14:30",orb(exit_time="14:30"))
print("### filters")
for f in ("wk","d20","nr4","noexp"): rep(f"filter={f}",orb(filt=f))
rep("last entry 10:45",orb(last_entry="10:45"))
rep("last entry 13:30",orb(last_entry="13:30"))
best=orb()
best["year"]=best.date.dt.year
print("### year by year (base rule)"); print(best.groupby("year").net.agg(["count","mean",lambda x:(x>0).mean()*100,"sum"]).round(1).rename(columns={"<lambda_0>":"win%"}).to_string())
print("long vs short:", best.groupby("side").net.agg(["count","mean"]).round(2).to_dict())
best.to_csv("/tmp/claude-0/data/orb_trades.csv",index=False)
# ---------- RANGE DAYS: how often does price stay within +/- X of 10:15 price until close? (for iron fly / condor)
print("\n### RANGE-DAY stats: max excursion from 10:15 price to 15:15, in ATR units")
rows=[]
for dt,m in B1.items():
    k=str(dt)
    if k not in d.index or np.isnan(d.loc[k].atr): continue
    dd=d.loc[k]; orr=m[m.index<m.index[0]+pd.Timedelta(minutes=60)]
    rest=m[(m.index>=m.index[0]+pd.Timedelta(minutes=60))&(m.index.strftime("%H:%M")<="15:15")]
    if len(rest)<100: continue
    p0=rest.Open.iat[0]
    rows.append(dict(date=dt, orx=(orr.High.max()-orr.Low.min())/dd.atr,
        maxexc=max(rest.High.max()-p0,p0-rest.Low.min())/dd.atr, endexc=abs(rest.Close.iat[-1]-p0)/dd.atr,
        atr_pct=dd.atr/dd.pc*100, expiry=dd.expiry, gap=abs(m.Open.iat[0]/dd.pc-1)*100))
r=pd.DataFrame(rows)
r["orb"]=pd.cut(r.orx,[0,0.3,0.45,0.6,0.8,9])
print("P(close within 0.3/0.5 ATR of 10:15 price) and median max excursion, by first-hour range bucket (x ATR)")
print(r.groupby("orb",observed=True).agg(n=("endexc","size"),close_in_0p3=("endexc",lambda x:(x<0.3).mean()*100),
      close_in_0p5=("endexc",lambda x:(x<0.5).mean()*100),never_beyond_0p5=("maxexc",lambda x:(x<0.5).mean()*100),
      med_maxexc=("maxexc","median")).round(1).to_string())
print("by expiry day:"); print(r.groupby("expiry").agg(close_in_0p3=("endexc",lambda x:(x<0.3).mean()*100),close_in_0p5=("endexc",lambda x:(x<0.5).mean()*100),med_maxexc=("maxexc","median")).round(1).to_string())
r["gapb"]=pd.cut(r.gap,[-.01,0.2,0.5,9])
print("by gap size:"); print(r.groupby("gapb",observed=True).agg(n=("endexc","size"),close_in_0p5=("endexc",lambda x:(x<0.5).mean()*100),med_maxexc=("maxexc","median")).round(2).to_string())
r.to_csv("/tmp/claude-0/data/rangeday.csv",index=False)
