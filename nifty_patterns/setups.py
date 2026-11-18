"""Backtest concrete intraday setups on 5-min Nifty bars. Returns in bps of index (1bp ~ 2.5 pts at 25k).
In-sample 2015-2020, out-of-sample 2021-2026. Cost 1.5 bps per round trip (slippage+fees on spread legs, approx)."""
import pandas as pd, numpy as np, sys
COST=1.5
df = pd.read_parquet("/tmp/claude-0/data/nifty_1m.parquet")
b5 = df.resample("5min", origin="start_day", offset="9h15min").agg({"Open":"first","High":"max","Low":"min","Close":"last"}).dropna()
d = df.resample("1D").agg({"Open":"first","High":"max","Low":"min","Close":"last"}).dropna()
d["pc"]=d.Close.shift(); d["ph"]=d.High.shift(); d["pl"]=d.Low.shift()
tr = pd.concat([d.High-d.Low,(d.High-d.pc).abs(),(d.Low-d.pc).abs()],axis=1).max(axis=1)
d["atr"]=tr.rolling(14).mean().shift()   # known before today
d["e20"]=d.Close.ewm(span=20,adjust=False).mean().shift()
d["e50"]=d.Close.ewm(span=50,adjust=False).mean().shift()
w = df.Close.resample("W-FRI").last(); we=w.ewm(span=10,adjust=False).mean()
d["wk_up"] = (w>we).reindex(d.index, method="ffill").shift().astype(float)  # last completed week
days = {k:v for k,v in b5.groupby(b5.index.date)}
def run_trade(bars, i, side, entry, stop, target, exit_time="15:20"):
    """walk bars after index i; stop/target checked on H/L (stop first if both hit = conservative)."""
    for j in range(i+1, len(bars)):
        h,l,t = bars.High.iat[j], bars.Low.iat[j], bars.index[j]
        if side>0:
            if l<=stop: return (stop/entry-1)*1e4, t
            if target and h>=target: return (target/entry-1)*1e4, t
        else:
            if h>=stop: return (entry/stop-1)*1e4, t
            if target and l<=target: return (entry/target-1)*1e4, t
        if t.strftime("%H:%M")>=exit_time: return side*(bars.Close.iat[j]/entry-1)*1e4, t
    return side*(bars.Close.iat[-1]/entry-1)*1e4, bars.index[-1]
def report(name, tr):
    if not len(tr): print(name,"no trades"); return
    t=pd.DataFrame(tr,columns=["date","side","r"]); t["date"]=pd.to_datetime(t.date); t["net"]=t.r-COST
    rows=[]
    for lab,s in [("IS 15-20",t[t.date<"2021"]),("OOS 21-26",t[t.date>="2021"]),("ALL",t)]:
        if len(s)==0: continue
        eq=s.net.cumsum(); dd=(eq-eq.cummax()).min()
        pf = s.net[s.net>0].sum()/max(1e-9,-s.net[s.net<0].sum())
        rows.append(f"{lab}: n={len(s):4d} win={(s.net>0).mean()*100:4.1f}% avg={s.net.mean():+5.2f}bp PF={pf:4.2f} tot={s.net.sum():+7.0f}bp maxDD={dd:6.0f}")
    print(f"--- {name}\n   "+"\n   ".join(rows))
    return t
R={}
# ---------- S1 Opening-range breakout (first N min), stop = other side of OR, exit at target k*OR or 15:20
def orb(N=15, k=None, narrow=None, trend=None, last_entry="11:30"):
    out=[]
    for dt,bars in days.items():
        dd=d.loc[str(dt)] if str(dt) in d.index else None
        if dd is None or np.isnan(dd.atr): continue
        nb=N//5; orr=bars.iloc[:nb]; hi,lo=orr.High.max(),orr.Low.min(); rng=hi-lo
        if narrow and rng > narrow*dd.atr: continue
        for i in range(nb,len(bars)):
            if bars.index[i].strftime("%H:%M")>last_entry: break
            c=bars.Close.iat[i]
            side = 1 if c>hi else (-1 if c<lo else 0)
            if side==0: continue
            if trend=="wk" and not np.isnan(dd.wk_up) and ((side>0)!=(dd.wk_up>0)): break
            if trend=="d20" and ((side>0)!=(dd.pc>dd.e20)): break
            stop = lo if side>0 else hi
            tgt = (c+side*k*rng) if k else None
            r,_=run_trade(bars,i,side,c,stop,tgt); out.append((dt,side,r)); break
    return out
print("========== S1 OPENING RANGE BREAKOUT (entry on 5m close beyond OR) ==========")
for N in (15,30):
    for narrow in (None,0.3):
        for k in (None,1.0,2.0):
            R[f"orb{N}_{narrow}_{k}"]=report(f"ORB{N} narrowOR<{narrow}*ATR target={k}xOR",orb(N,k,narrow))
R["orb15_wk"]=report("ORB15 + weekly trend filter",orb(15,None,None,"wk"))
R["orb15_d20"]=report("ORB15 + daily EMA20 filter",orb(15,None,None,"d20"))
# ---------- S2 Gap fade toward previous close
def gapfade(lo_g=0.2, hi_g=0.6, wait=15, stop_atr=0.35):
    out=[]
    for dt,bars in days.items():
        k=str(dt)
        if k not in d.index: continue
        dd=d.loc[k]
        if np.isnan(dd.atr): continue
        gap=(bars.Open.iat[0]/dd.pc-1)*100
        if not (lo_g<=abs(gap)<=hi_g): continue
        i=wait//5-1; c=bars.Close.iat[i]
        side=-1 if gap>0 else 1
        # require first N minutes NOT extending the gap (price back inside the opening bar)
        if side<0 and c>bars.Open.iat[0]: continue
        if side>0 and c<bars.Open.iat[0]: continue
        stop = c - side*stop_atr*dd.atr
        tgt = dd.pc
        r,_=run_trade(bars,i,side,c,stop,tgt,"13:00"); out.append((dt,side,r))
    return out
print("\n========== S2 GAP FADE (gap 0.2-0.6%, first 15m fails to extend, target prev close) ==========")
for lo_g,hi_g in [(0.2,0.6),(0.15,0.5),(0.3,0.8)]:
    for st in (0.25,0.35,0.5):
        R[f"gap_{lo_g}_{hi_g}_{st}"]=report(f"GapFade {lo_g}-{hi_g}% stop={st}ATR",gapfade(lo_g,hi_g,15,st))
# ---------- S3 Intraday momentum: first 30 min (or open->13:15) predicts last hour
def lasthour(start="14:25", sig_end="14:25", thr=0.0):
    out=[]
    for dt,bars in days.items():
        k=str(dt)
        if k not in d.index or np.isnan(d.loc[k].pc): continue
        try:
            s=bars.between_time("09:15",sig_end); e=bars.between_time(start,"15:25")
        except: continue
        if len(e)<3: continue
        sig=(s.Close.iat[-1]/d.loc[k].pc-1)*100
        if abs(sig)<thr: continue
        side=np.sign(sig); r=side*(e.Close.iat[-1]/s.Close.iat[-1]-1)*1e4
        out.append((dt,side,r))
    return out
print("\n========== S3 INTRADAY MOMENTUM: prev close->14:25 direction, hold 14:25->15:25 ==========")
for thr in (0,0.5,1.0):
    R[f"lh_{thr}"]=report(f"Last-hour momentum |move|>{thr}%",lasthour(thr=thr))
# ---------- S4 Previous-day high/low breakout after 10:15 with 1H confirmation
def pdhl(stop_atr=0.3, k_atr=None):
    out=[]
    for dt,bars in days.items():
        k=str(dt)
        if k not in d.index: continue
        dd=d.loc[k]
        if np.isnan(dd.atr): continue
        if bars.Open.iat[0]>dd.ph or bars.Open.iat[0]<dd.pl: continue  # need open inside prior range
        for i in range(12,len(bars)):
            if bars.index[i].strftime("%H:%M")>"13:30": break
            c=bars.Close.iat[i]
            side = 1 if c>dd.ph else (-1 if c<dd.pl else 0)
            if side==0: continue
            r,_=run_trade(bars,i,side,c,c-side*stop_atr*dd.atr,(c+side*k_atr*dd.atr) if k_atr else None)
            out.append((dt,side,r)); break
    return out
print("\n========== S4 PREV-DAY HIGH/LOW BREAKOUT (open inside PDR, 5m close beyond after 10:15) ==========")
for st in (0.2,0.3,0.5):
    for k in (None,0.5):
        R[f"pd_{st}_{k}"]=report(f"PDHL stop={st}ATR tgt={k}ATR",pdhl(st,k))
pd.to_pickle(R,"/tmp/claude-0/data/setups.pkl")
