import argparse
import os
from typing import Optional

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates


def plot_for_id(df_id: pd.DataFrame, idparc: str, out_dir: str, max_xticks: int = 20) -> Optional[str]:
	"""Create a bar chart for a single idparc.

	- Grey bars: capacitesoliste (background)
	- Overlay bars: jrdinfosoliste, colored green if etatouverture == 'OUVERT', else red

	Returns the path to the saved figure or None if df is empty.
	"""
	if df_id.empty:
		return None

	# Ensure data types
	df_id = df_id.copy()
	# Sort by time
	df_id = df_id.sort_values("lastupdate")

	# Basic cleaning
	for col in ["capacitesoliste", "jrdinfosoliste"]:
		df_id[col] = pd.to_numeric(df_id[col], errors="coerce")

	# If both series are completely empty, nothing to plot for this id
	if not (df_id["capacitesoliste"].notna().any() or df_id["jrdinfosoliste"].notna().any()):
		return None

	# Build x positions as true time axis
	ts = pd.to_datetime(df_id["lastupdate"], errors="coerce")
	# Determine a reasonable bar width from typical sampling interval (in days for matplotlib)
	deltas = ts.diff().dropna()
	if len(deltas) == 0:
		typical = pd.Timedelta(minutes=1)
	else:
		# median is robust to outliers; fallback to 1 minute if invalid
		typical = deltas.median()
		if not isinstance(typical, pd.Timedelta) or typical <= pd.Timedelta(0):
			typical = pd.Timedelta(minutes=1)
	# convert to fraction of day to match matplotlib date units
	width_days = typical.total_seconds() / (24 * 3600) * 0.8  # 80% of the interval

	# Numeric series (NaN kept -> gaps)
	cap = df_id["capacitesoliste"].to_numpy(dtype=float)
	val = df_id["jrdinfosoliste"].to_numpy(dtype=float)
	states = df_id["etatouverture"].astype(str).str.upper().values

	# Colors for overlay values (green for open, red otherwise)
	colors = ["#BDBDBD" if s == "OUVERT" else "#C62828" for s in states]

	# Figure size scales lightly with number of points, bounded
	width_per_bar = 0.15  # inches per bar baseline
	fig_width = max(10.0, min(24.0, 2.0 + len(df_id) * width_per_bar))
	fig_height = 6.0
	fig, ax = plt.subplots(figsize=(fig_width, fig_height))

	# Background capacity bars (light grey); NaN height -> no bar -> gap
	ax.bar(ts, cap, color=colors, alpha=0.7, width=width_days, label="Capacité")

	# Overlay jrdinfosoliste bars, colored by state; NaN height -> gap
	ax.bar(ts, val, color="#2E7D32", width=width_days * 0.7, label="jrdinfosoliste")

	# Titles and labels
	ax.set_title(f"{idparc} — Capacité vs jrdinfosoliste")
	ax.set_ylabel("Places")

	# X axis: use date formatter and limit number of ticks
	if len(df_id) <= max_xticks:
		tick_idx = list(range(len(df_id)))
	else:
		stride = max(1, len(df_id) // max_xticks)
		tick_idx = list(range(0, len(df_id), stride))
	selected_ticks = [ts.iloc[i] for i in tick_idx if pd.notna(ts.iloc[i])]
	ax.set_xticks(mdates.date2num(selected_ticks))
	ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d\n%H:%M"))
	for tick in ax.get_xticklabels():
		tick.set_rotation(45)
		tick.set_horizontalalignment("right")

	# Legend: show state color meaning in a custom way
	from matplotlib.patches import Patch
	legend_handles = [
		Patch(color="#BDBDBD", alpha=0.7, label="Capacité"),
		Patch(color="#2E7D32", label="jrdinfosoliste (OUVERT)"),
		Patch(color="#C62828", label="jrdinfosoliste (FERMÉ/Autre)"),
	]
	ax.legend(handles=legend_handles, loc="upper right")

	ax.grid(axis="y", linestyle=":", alpha=0.4)
	fig.tight_layout()

	os.makedirs(out_dir, exist_ok=True)
	safe_id = "".join(c for c in str(idparc) if c.isalnum() or c in ("-", "_")) or "chart"
	out_path = os.path.join(out_dir, f"{safe_id}.png")
	fig.savefig(out_path, dpi=150)
	plt.close(fig)
	return out_path


def main():
	parser = argparse.ArgumentParser(description="Génère un graphique en barres par idparc.")
	parser.add_argument(
		"--csv",
		default="data.csv",
		help="Chemin vers le CSV (colonnes attendues: idparc,lastupdate,etatouverture,capacitesoliste,jrdinfosoliste)",
	)
	parser.add_argument(
		"--out",
		default="figures",
		help="Dossier de sortie pour les images PNG",
	)
	parser.add_argument(
		"--max-xticks",
		type=int,
		default=20,
		help="Nombre maximum d'étiquettes sur l'axe X (pour éviter la surcharge)",
	)

	args = parser.parse_args()

	# Load data
	df = pd.read_csv(
		args.csv,
		sep=",",
		dtype=str,  # read as string first, convert selectively
		encoding="utf-8",
	)

	required_cols = {"idparc", "lastupdate", "etatouverture", "capacitesoliste", "jrdinfosoliste"}
	missing = required_cols.difference(df.columns)
	if missing:
		raise ValueError(f"Colonnes manquantes dans le CSV: {sorted(missing)}")

	# Group by idparc and plot each group
	saved = []
	for idparc, df_id in df.groupby("idparc", sort=True):
		out_path = plot_for_id(df_id, str(idparc), args.out, max_xticks=args.max_xticks)
		if out_path:
			saved.append(out_path)

	print(f"Graphiques créés: {len(saved)} fichiers dans '{args.out}'.")


if __name__ == "__main__":
	main()

