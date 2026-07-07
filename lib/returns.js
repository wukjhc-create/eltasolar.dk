// Tilbagekoersler som LOGBOG: en haendelse med dato pr. gang en sag koerer tilbage.
// - Taeller i den uge/maaned hvor den blev registreret - uanset genplanlaegning
// - Modregnes ALDRIG naar sagen senere lukkes til fakturering
// - Fejlregistreringer slettes eksplicit paa siden "Tilbagekoersler" i admin
// "active" betyder kun "sagen staar AKTUELT til genbesoeg" (forhindrer dubletter) -
// alle haendelser taeller i statistikken, aktive som afsluttede.

import { db } from "./db";

// Kaldes naar en sags status aendrer sig (fra sync eller manuelle opgaver):
// - nyt genbesoeg uden aktiv haendelse -> ny raekke i logbogen
// - sagen forlader genbesoeg -> haendelsen afsluttes (men bliver staaende og taeller)
export async function reconcileReturn(client, orderNumber, title, newStatus, reason, fag = null) {
  if (!orderNumber) return { created: false };
  const c = client || db();
  let query = c
    .from("returns")
    .select("id")
    .eq("order_number", orderNumber)
    .eq("active", true);
  query = fag ? query.eq("fag", fag) : query.is("fag", null);
  const { data: activeEvent } = await query.maybeSingle();

  if (newStatus === "tilbage") {
    if (activeEvent) return { created: false };
    await c.from("returns").insert({
      order_number: orderNumber,
      title: title || null,
      reason: reason || "Andet",
      fag,
    });
    return { created: true };
  }
  if (activeEvent) {
    await c.from("returns").update({ active: false }).eq("id", activeEvent.id);
  }
  return { created: false };
}

export async function getReturns(fromISO, toISO) {
  const { data } = await db()
    .from("returns")
    .select("*")
    .gte("date", fromISO)
    .lte("date", toISO)
    .order("date", { ascending: false });
  return data || [];
}
