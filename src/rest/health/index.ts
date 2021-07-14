import { Request, Response, Router } from 'express';
export const router = Router();

router.get('/health', async function (_req: Request, res: Response) {
  res.send('ok');
});
