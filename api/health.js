import { getRuntimeConfig } from "../lib/grill.js";

export default function handler(req, res) {
  res.status(200).json({ ok: true, ...getRuntimeConfig() });
}
