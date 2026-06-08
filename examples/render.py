#!/usr/bin/env python3
"""Render invoice: ambil JSON mentah, hitung total, isi template, hasilkan PDF.
Ini meniru peran 'rendering engine' di arsitektur: klien hanya kirim data mentah,
engine yang menghitung subtotal/pajak/total dan terbilang."""
import json, sys
from pybars import Compiler
from weasyprint import HTML

def terbilang(n):
    n = int(round(n))
    satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam",
              "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
    def f(x):
        if x < 12:
            return satuan[x]
        elif x < 20:
            return f(x - 10) + " belas"
        elif x < 100:
            return f(x // 10) + " puluh" + ((" " + f(x % 10)) if x % 10 else "")
        elif x < 200:
            return "seratus" + ((" " + f(x - 100)) if x - 100 else "")
        elif x < 1000:
            return f(x // 100) + " ratus" + ((" " + f(x % 100)) if x % 100 else "")
        elif x < 2000:
            return "seribu" + ((" " + f(x - 1000)) if x - 1000 else "")
        elif x < 1_000_000:
            return f(x // 1000) + " ribu" + ((" " + f(x % 1000)) if x % 1000 else "")
        elif x < 1_000_000_000:
            return f(x // 1_000_000) + " juta" + ((" " + f(x % 1_000_000)) if x % 1_000_000 else "")
        else:
            return f(x // 1_000_000_000) + " miliar" + ((" " + f(x % 1_000_000_000)) if x % 1_000_000_000 else "")
    if n == 0:
        return "nol rupiah"
    return " ".join((f(n) + " rupiah").split()).strip().capitalize()

# --- muat data mentah ---
data = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "invoice-data.json"))

# --- engine menghitung nilai turunan ---
subtotal = 0
for it in data["items"]:
    it["amount"] = it["qty"] * it["unit_price"]
    subtotal += it["amount"]
discount = data.get("discount", 0)
dpp = subtotal - discount
tax_amount = round(dpp * data.get("tax_rate", 0) / 100)
total = dpp + tax_amount

data["subtotal"] = subtotal
data["tax_amount"] = tax_amount
data["total"] = total
data["amount_in_words"] = terbilang(total)

# --- helper Handlebars ---
def h_rupiah(this, value):
    try:
        v = int(round(float(value)))
    except (TypeError, ValueError):
        return value
    return "Rp " + f"{v:,}".replace(",", ".")

def h_inc(this, value):
    return value + 1

compiler = Compiler()
template = compiler.compile(open("invoice.html", encoding="utf-8").read())
html_out = template(data, helpers={"rupiah": h_rupiah, "inc": h_inc})

open("invoice-merged.html", "w", encoding="utf-8").write(html_out)
HTML(string=html_out).write_pdf("invoice.pdf")
print("OK -> invoice.pdf  | subtotal:", subtotal, "total:", total)
print("Terbilang:", data["amount_in_words"])
