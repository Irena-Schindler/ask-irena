// Public, non-secret settings for the widget.
export default function handler(req, res) {
  res.setHeader("cache-control", "public, max-age=300");
  res.status(200).json({ bookingUrl: process.env.BOOKING_URL || "" });
}
