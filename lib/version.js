// Dataversion: et lille tal der bumpes ved enhver aendring.
// Tavleskaermen poller kun dette (naesten gratis i trafik) og henter
// foerst den fulde tavle, naar versionen har aendret sig.
import { db } from "./db";

export async function bumpDataVersion(client) {
  await (client || db())
    .from("settings")
    .upsert({ key: "data_version", value: String(Date.now()) }, { onConflict: "key" });
}
