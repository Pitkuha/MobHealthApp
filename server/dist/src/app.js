import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/error';
import { apiRouter } from './routes';
export function createApp() {
    const app = express();
    app.use(cors({
        origin: env.corsOrigin === '*' ? true : env.corsOrigin
    }));
    app.use(helmet());
    app.use(express.json());
    app.use(morgan('dev'));
    app.use('/api', apiRouter);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
