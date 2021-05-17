import logger from '../../logger';
import { ImplContext } from '../utils/context';

export const loggerInterceptor = async function (ctx: ImplContext<any, any>, next: Function) {
  const startAt = Date.now();
  console.info(`[Req] ${new Date().toISOString()}, req: ${JSON.stringify(ctx.call.request)}`);
  await next();
  const costTime = Date.now() - startAt;
  logger.info(`[Res] ${new Date().toISOString()}, cost ${costTime} ms, ${JSON.stringify(ctx.body)}`);
};
