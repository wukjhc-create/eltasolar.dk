import { createHash } from "crypto";

// Session-token afledt af admin-adgangskoden.
// Samme beregning bruges i middleware (med WebCrypto).
export function sessionToken() {
  return createHash("sha256")
    .update(`${process.env.ADMIN_PASSWORD || ""}:tavle-admin-session`)
    .digest("hex");
}
