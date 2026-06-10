-- Migration 0010: izinkan gateway pembayaran 'kasugai'
-- Kasugai adalah payment gateway internal (proxy di atas Midtrans).
-- Top-up sekarang lewat Kasugai, menggantikan integrasi Midtrans langsung.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_gateway_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_gateway_check
  CHECK (gateway IN ('xendit', 'midtrans', 'kasugai'));

-- Method Kasugai berformat panjang (mis. 'midtrans_qris', 'midtrans_va_bni').
-- Lepas CHECK lama yang membatasi ke qris/va/ewallet/card.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
