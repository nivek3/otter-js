import { Middleware } from 'koa-compose';
import { v4 as uuidV4 } from 'uuid';
import logger from '../../logger';
import { ImplContext } from '../../utils/context';

export const loggerInterceptor: Middleware<ImplContext<unknown, unknown>> = async function <T, K>(ctx: ImplContext<T, K>, next: Function) {
  const startAt = Date.now();
  if (!ctx.call.metadata.get('requestId')[0]) {
    ctx.call.metadata.set('requestId', uuidV4());
  }
  const requestId = ctx.call.metadata.get('requestId')[0];
  try {
    logger.info(
      `[Req] ${new Date().toISOString()}, ${requestId}, req: ${JSON.stringify(ctx.call.request)}, metadata: ${JSON.stringify(
        ctx.call.metadata,
      )}`,
    );
    await next();
  } catch (error) {
    logger.error(`[Res] ${new Date().toISOString()}}, ${requestId}, metadata: ${JSON.stringify(ctx.call.metadata.getMap())}`, error);
    throw error;
  } finally {
    const costTime = Date.now() - startAt;
    logger.info(`[Res] ${new Date().toISOString()}, ${requestId}, cost ${costTime} ms, ${JSON.stringify(ctx.body)}`);
  }
};
