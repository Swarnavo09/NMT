"""Final playbook backtest: Setup A (narrow 30m ORB, 0.6 ATR trail) + Setup B (prev-day H/L breakout, 0.25 ATR stop)."""
import sys; sys.path.insert(0,"/home/user/NMT/nifty_patterns")
import pandas as pd, numpy as np
from refine_lib import *
d["ph"]=d.High.shift(); d["pl"]=d.Low.shift()
A = orb(OR=30, narrow=0.35, tf="5min", trail_atr=0.6); A["setup"]="A_narrowORB"
out=[]
for dt,bars in B["5min"].items():
    k=str(dt)
    if k not in d.index: continue
    dd=d.loc[k]
    if np.isnan(dd.atr) or not (dd.pl<bars.Open.iat[0]<dd.ph): continue
    m1=B1[dt]
    for t,c in zip(bars.index,bars.Close.values):
        hm=t.strftime("%H:%M")
        if hm<"10:15": continue
        if hm>"13:30": break
        side=1 if c>dd.ph else (-1 if c<dd.pl else 0)
        if side==0: continue
        r=sim(m1,t+pd.Timedelta("5min"),side,c,c-side*0.25*dd.atr,None,"15:20",0.6*dd.atr)
        out.append((dt,side,r,np.nan)); break
Bt=pd.DataFrame(out,columns=["date","side","r","orx"]); Bt["date"]=pd.to_datetime(Bt.date); Bt["net"]=Bt.r-COST; Bt["setup"]="B_PDHL"
for nm,t in (("Setup A",A),("Setup B",Bt)): print(f"{nm:10s} IS {stats(t[t.date<'2021'])} | OOS {stats(t[t.date>='2021'])}")
both=pd.concat([A,Bt]); daily=both.groupby("date").net.sum()
print("same-day overlap:", len(set(A.date)&set(Bt.date)), "days; corr of daily pnl on overlap days:",
      round(pd.concat([A.set_index('date').net,Bt.set_index('date').net],axis=1,join='inner').corr().iat[0,1],2))
mo=daily.resample("ME").sum(); mo=mo[mo!=0]
yr=daily.resample("YE").sum()
print(f"COMBINED trades={len(both)} avg/trade={both.net.mean():.2f}bp win={(both.net>0).mean()*100:.1f}%  PF={both.net[both.net>0].sum()/-both.net[both.net<0].sum():.2f}")
print(f"profitable months {(mo>0).mean()*100:.0f}% of {len(mo)} | profitable years {(yr>0).sum()}/{len(yr)}")
eq=daily.cumsum(); print(f"max drawdown {(eq-eq.cummax()).min():.0f}bp  total {eq.iat[-1]:.0f}bp  (1bp ~ 2.5 Nifty pts @25k)")
# losing-streak
s=(both.sort_values('date').net<0).astype(int); streak=s.groupby((s!=s.shift()).cumsum()).sum().max(); print("longest losing streak (trades):",streak)
# payoff shape: what fraction of profit comes from top 10% of trades
top=both.net.sort_values(ascending=False); print(f"top 10% of trades produce {top.iloc[:len(top)//10].sum()/top.sum()*100:.0f}% of net profit; avg win {both.net[both.net>0].mean():.1f}bp avg loss {both.net[both.net<0].mean():.1f}bp")
print("by year (bp):", yr.round(0).astype(int).to_dict())
both.to_csv("/home/user/NMT/nifty_patterns/trades_final.csv",index=False)
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(10,4.5))
for nm,t in (("A: narrow 30m ORB",A),("B: prev-day H/L break",Bt)): ax.plot(t.groupby("date").net.sum().cumsum(),lw=1.3,label=nm)
ax.plot(eq,lw=2,color="k",label="Combined")
ax.axvline(pd.Timestamp("2021-01-01"),ls="--",color="gray"); ax.text(pd.Timestamp("2021-02-01"),eq.max()*0.95,"out-of-sample →",color="gray")
ax.set_ylabel("cumulative net bps of Nifty (after 1.5bp cost)"); ax.set_title("Nifty 50 intraday playbook, 2015–2026 (1 lot-equivalent, no compounding)"); ax.legend(frameon=False); ax.grid(alpha=.3)
plt.tight_layout(); plt.savefig("/home/user/NMT/nifty_patterns/equity_curve.png",dpi=130)
