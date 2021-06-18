import { parseSignature } from './../../src/utils/signature';

describe('utils signature', () => {
  describe('parseSignature', () => {
    test('r + v + s, length is 130', () => {
      const data =
        'a00f352c3d41845cdb35ef4f4d57938170fa4f45004328a31dc77311dca165667d2346ca4192cda605769ef1ccec89217aac429070439f8cc70ee5580a0ecb3a01';
      const { r, s, v } = parseSignature(data);
      expect(r).toEqual('a00f352c3d41845cdb35ef4f4d57938170fa4f45004328a31dc77311dca16566');
      expect(s).toEqual('7d2346ca4192cda605769ef1ccec89217aac429070439f8cc70ee5580a0ecb3a');
      expect(v).toEqual(1);
    });

    test('r + v, length is 128', () => {
      const data =
        'a00f352c3d41845cdb35ef4f4d57938170fa4f45004328a31dc77311dca165667d2346ca4192cda605769ef1ccec89217aac429070439f8cc70ee5580a0ecb3a';
      const { r, s, v } = parseSignature(data);
      expect(r).toEqual('a00f352c3d41845cdb35ef4f4d57938170fa4f45004328a31dc77311dca16566');
      expect(s).toEqual('7d2346ca4192cda605769ef1ccec89217aac429070439f8cc70ee5580a0ecb3a');
      expect(v).toBeUndefined();
    });
  });
});
