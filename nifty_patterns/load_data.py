"""Build a single clean 1-minute NIFTY 50 series (2015-01 .. latest) from two public datasets."""
import glob, pandas as pd, numpy as np, sys
D = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/data"
a = pd.read_csv(f"{D}/Nifty50-Minute-Data/nifty50_candlestick_data.csv")
a.index = pd.to_datetime(a.Date + " " + a.Time, format="%d-%m-%Y %H:%M:%S")
a = a[["Open", "High", "Low", "Close"]]
fs = sorted(glob.glob(f"{D}/nifty50-historical-data/1min/*/*.csv"))
b = pd.concat([pd.read_csv(f, usecols=[1, 2, 3, 4, 5]) for f in fs])
b.index = pd.to_datetime(b.Timestamp); b = b[["Open", "High", "Low", "Close"]]
ov = a.index.intersection(b.index)
diff = (a.loc[ov, "Close"] - b.loc[ov, "Close"]).abs()
print(f"overlap bars={len(ov)}  median |close diff|={diff.median():.2f}  99pct={diff.quantile(.99):.2f}")
df = pd.concat([a[a.index < b.index[0]], b]).sort_index()
df = df[~df.index.duplicated()]
df = df.between_time("09:15", "15:29")
df = df[(df[["Open","High","Low","Close"]] > 0).all(axis=1)]
# drop days with very few bars (muhurat / partial sessions)
n = df.groupby(df.index.date).size(); good = n[n >= 300].index
df = df[pd.Index(df.index.date).isin(good)]
print(df.index[0], df.index[-1], len(df), "bars", len(good), "days")
df.to_parquet(f"{D}/nifty_1m.parquet")
