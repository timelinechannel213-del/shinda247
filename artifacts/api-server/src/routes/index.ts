import { Router, type IRouter } from 'express';
import healthRouter from './health';
import authRouter   from './auth';
import gameRouter   from './game';
import mpesaRouter  from './mpesa';

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(gameRouter);
router.use(mpesaRouter);

export default router;
