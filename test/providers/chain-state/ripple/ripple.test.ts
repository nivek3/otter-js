import 'dotenv/config';
import { provider } from '@src/providers/chain-state/ripple/ripple';

describe('ChainStateProvider Ripple', () => {
  describe('canonicalAndToDER', () => {
    test('testnet', () => {
      const signature =
        'dd4aeb145ed63b11863b54f24afb42d7753d87e1bca0efca7271db4f1fc084daa5d6f4665abc78d28c726a554d6c51ce024535ff35b338ca783886235dc8105c01';
      const expected =
        '3045022100DD4AEB145ED63B11863B54F24AFB42D7753D87E1BCA0EFCA7271DB4F1FC084DA02205A290B99A543872D738D95AAB293AE30B869A6E7799567714799D869726E30E5';
      const result = provider.canonicalAndToDER(signature);
      expect(result).toEqual(expected);
    });
  });
});
