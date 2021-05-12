export function isUndefined<T>(value: T) {
  return value === undefined;
}

export function valueOrDefault<T>(value: T | undefined, defaultVal: T): T {
  return value !== undefined ? value : defaultVal;
}

export function verifyBlockId(blockId: string | number | undefined) {
  if (!blockId) {
    throw 'Missing parameters blockId';
  }
  if (blockId && blockId != 'latest') {
    let blockIdString = String(blockId)
    let height = parseInt(blockIdString, 10);
    if (Number.isNaN(height) || height.toString(10) !== blockId) {
      throw 'Invalid parameter blockId';
    }
  }
}