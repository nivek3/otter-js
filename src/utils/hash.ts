export const preparePrefix = (key: string, prefix = '0x') => {
  if (!key.startsWith(prefix)) {
    key = prefix + key;
  }
  return key;
};

export const trimPrefix = (key: string, prefix = '0x') => {
  if (key.startsWith(prefix)) {
    key = key.slice(prefix.length);
  }
  return key;
};
