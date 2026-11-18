"""Multi-timeframe trend alignment -> forward 5m returns. No look-ahead: a TF's state is only
known after its bar closes (state stamped at bar END time, merged backward)."""
import pandas as pd, numpy as np
df = pd.read_parquet("/tmp/claude-0/data/nifty_1m.parquet")
AGG={"Open":"first","High":"max","Low":"min","Close":"last"}
def bars(rule, **kw):
    b = df.resample(rule, label="left", closed="left", **kw).agg(AGG).dropna()
    return b
TF = {"W":bars("W-MON"), "D":bars("1D"),
      "4H":bars("240min", origin="start_day", offset="9h15min"),
      "1H":bars("60min", origin="start_day", offset="9h15min"),
      "15m":bars("15min", origin="start_day", offset="9h15min"),
      "10m":bars("10min", origin="start_day", offset="9h15min"),
      "5m":bars("5min", origin="start_day", offset="9h15min")}
# bar end timestamps (last minute in bar + 1min)
end = df.index.to_series()
def stamp(b, rule_kw):
    pass
def state(b, kind):
    c=b.Close
    if kind=="ema": return np.sign(c - c.ewm(span=20, adjust=False).mean())
    if kind=="ema921": return np.sign(c.ewm(span=9,adjust=False).mean()-c.ewm(span=21,adjust=False).mean())
    if kind=="hh":  # close above prior bar's high = +1, below prior low = -1, else carry
        s = pd.Series(np.where(c>b.High.shift(),1,np.where(c<b.Low.shift(),-1,np.nan)), b.index).ffill()
        return s
base = TF["5m"].copy()
base.index=base.index.as_unit("ns"); base["t_end"] = base.index + pd.Timedelta(minutes=5)
# forward returns from 5m close
c=base.Close; day=base.index.date
dayclose = base.groupby(day).Close.transform("last")
for k in (6,12): base[f"f{k}"] = (c.shift(-k)/c-1)*1e4
base.loc[pd.Series(day,index=base.index).shift(-12).ne(pd.Series(day,index=base.index)).values,["f12"]]=np.nan
base.loc[pd.Series(day,index=base.index).shift(-6).ne(pd.Series(day,index=base.index)).values,["f6"]]=np.nan
base["feod"]=(dayclose/c-1)*1e4
def end_times(name,b):
    # actual end time = last 1m timestamp inside bar + 1 minute
    m = df.index.as_unit("ns"); bi = b.index.as_unit("ns")
    pos = np.searchsorted(bi.values, m.values, side="right")-1
    last = pd.Series(m.values).groupby(pos).max()
    e = pd.Series(pd.NaT, index=range(len(b)), dtype="datetime64[ns]"); e.loc[last.index] = last.values
    return pd.DatetimeIndex(e.values) + pd.Timedelta(minutes=1)
for kind in ("ema","ema921","hh"):
    out = base[["t_end","f6","f12","feod"]].copy()
    for name,b in TF.items():
        s = state(b,kind).to_frame("s"); s["t"] = end_times(name,b); s=s.dropna().sort_values("t")
        out = pd.merge_asof(out.sort_values("t_end"), s.rename(columns={"s":name}), left_on="t_end", right_on="t", direction="backward").drop(columns="t")
    out.index = base.sort_values("t_end").index
    tfs=list(TF); out["score"]=out[tfs].sum(axis=1)
    out=out.dropna(subset=tfs)
    print(f"\n######## trend definition = {kind}   (fwd returns in bps; 10bps ~ 25 Nifty pts)")
    print("score = sum of +1/-1 across", tfs)
    g=out.groupby("score")
    print(pd.DataFrame({"n":g.size(),"f30m":g.f6.mean().round(2),"f60m":g.f12.mean().round(2),"toEOD":g.feod.mean().round(2),
        "P(up 60m)":g.f12.apply(lambda x:(x>0).mean()*100).round(1)}).to_string())
    # single TF contribution
    print("single-TF: mean fwd60m bps when +1 minus when -1")
    print({t: round(out.loc[out[t]>0,"f12"].mean()-out.loc[out[t]<0,"f12"].mean(),2) for t in tfs})
    out.to_parquet(f"/tmp/claude-0/data/mtf_{kind}.parquet")
