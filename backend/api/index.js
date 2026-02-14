import 'dotenv/config';
import app from '../src/app.js';
import { seedData } from '../src/store/seed.js';

seedData();

export default app;
