// Public settings + a fresh signed anti-bot challenge for the widget.
import { randomBytes } from "node:crypto";
import { POW_BITS, sign } from "../lib/token.js";

export default function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    bookingUrl: process.env.BOOKING_URL || "",
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    challenge: sign({ ts: Date.now(), r: randomBytes(8).toString("hex") }),
    bits: POW_BITS,
  });
}
