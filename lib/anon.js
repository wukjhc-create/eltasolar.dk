// Anonyme koder til den offentlige tavle: ET fortloebende bilnummer
// oppefra og ned, saa numrene matcher OS Vehicle-listen:
//   Hold 1 = Bil 1 ... Hold 4 = Bil 4, foerste elektriker = Bil 5 osv.
// Koblingen til navne er intern viden og ses kun i admin (bag login).
// Raekkefoelgen foelger tavlens visning (holdenes og medarbejdernes sortering).

import { groupForBoard } from "./stats";

export function buildCodes(employees, teams) {
  const groups = groupForBoard(employees, teams);
  const teamCode = new Map();
  const empCode = new Map();
  let n = 0;

  for (const g of groups) {
    if (String(g.team.id).startsWith("rolle-")) {
      for (const e of g.employees) {
        n++;
        empCode.set(e.id, `Bil ${n}`);
      }
    } else {
      n++;
      teamCode.set(g.team.id, `Bil ${n}`);
      for (const e of g.employees) empCode.set(e.id, `Bil ${n}`);
    }
  }
  return { teamCode, empCode };
}
