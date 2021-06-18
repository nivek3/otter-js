export const parseSignature = (signature: string) => {
  const length = signature.length;
  const unitLen = length >> 2;
  const r = signature.slice(0, unitLen << 1);
  const s = signature.slice(unitLen << 1, unitLen << 2);
  const v = unitLen << 2 < length ? Number.parseInt(signature.slice(unitLen << 2), 16) : undefined;
  return { r, s, v };
};
