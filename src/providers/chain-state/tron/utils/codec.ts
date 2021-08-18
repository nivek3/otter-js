export const encode = (tx: object) => {
  return Buffer.from(JSON.stringify(tx)).toString('hex');
};

export const decode = (serialized: string) => {
  try {
    return JSON.parse(Buffer.from(serialized, 'hex').toString());
  } catch {
    return {};
  }
};
