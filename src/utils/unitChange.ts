export function trimEnd(buffer) {
	var pos = 0
	for (var i = buffer.length - 1; i >= 0; i--) {
		if (buffer[i] !== 0x00) {
			pos = i
			break
		}
	}
	return buffer.slice(0, pos + 1)
}

export function decToHex(dec: number): string {
  let hex: string = dec.toString(16);
  return `0x${hex}`;
}

export function hexToDec(hex: string): number {
  let num: number = parseInt(hex, 16);
  return num;
}
// 字符串转16进制
export function str2hex(str: string): string {
  if (str === '') {
    return '';
  }
  var arr: string[] = [];
  arr.push('0x');
  for (var i = 0; i < str.length; i++) {
    arr.push(str.charCodeAt(i).toString(16));
  }
  return arr.join('');
}

// 字符串转16进制 no 0x
export function str2hexNo0x(str: string): string {
  if (str === '') {
    return '';
  }
  var arr: string[] = [];
  // arr.push("0x");
  for (var i = 0; i < str.length; i++) {
    arr.push(str.charCodeAt(i).toString(16));
  }
  return arr.join('');
}

// 16进制转字符串
export function hex2str(hex: string): string {
  var trimedStr = hex.trim();
  var rawStr: string = trimedStr.substr(0, 2).toLowerCase() === '0x' ? trimedStr.substr(2) : trimedStr;
  var len = rawStr.length;
  if (len % 2 !== 0) {
    throw 'Illegal Format ASCII Code!';
  }
  var curCharCode: number;
  var resultStr: string[] = [];
  for (var i = 0; i < len; i = i + 2) {
    curCharCode = parseInt(rawStr.substr(i, 2), 16);
    resultStr.push(String.fromCharCode(curCharCode));
  }
  return resultStr.join('');
}
