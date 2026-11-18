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
