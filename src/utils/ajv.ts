import Ajv, { Options } from 'ajv';
import AjvErrors from 'ajv-errors';
import AjvMergePatch from 'ajv-merge-patch';
import { AppError, errors } from '@src/error';

export class Validator {
  options: Options;
  constructor(options: Options) {
    this.options = Object.assign(
      {
        allErrors: true,
      },
      options,
    );
  }

  validate(schema: object, req: object): string | void {
    const ajv = new Ajv(this.options);
    AjvErrors(ajv);
    AjvMergePatch(ajv);
    const validate = ajv.compile(JSON.parse(JSON.stringify(schema)));
    const valid = validate(req);
    if (valid) return;
    return validate.errors?.map((e) => (e.instancePath || e.schemaPath || '') + ': ' + e.message).join('\n');
  }

  assert(schema: object, req: object): void {
    const details = this.validate(schema, req);
    if (details) throw new AppError(errors.INVALID_ARGUMENT, { details });
    return;
  }
}
