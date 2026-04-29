// Tiny RFC4180-ish CSV row parser. Used in admin/import widgets to read a
// dropped CSV in the browser without pulling in csv-parse on the client.
//
// Supports quoted values, embedded quotes (escaped as ""), and commas inside
// quotes. Does NOT handle multi-line quoted fields — callers split on \n first.
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}
