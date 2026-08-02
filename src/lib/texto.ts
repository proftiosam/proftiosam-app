/** "1 dia" / "2 dias". Português concorda, e "1 dias" na tela parece amador. */
export function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** "falta 1 dia" / "faltam 3 dias" — o verbo também concorda. */
export function faltam(n: number): string {
  return n === 1 ? "falta 1 dia" : `faltam ${n} dias`;
}
