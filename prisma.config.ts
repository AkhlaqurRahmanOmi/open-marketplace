import { config } from 'dotenv';

// Load environment variables from .env file
config();

export default {
  schema: 'prisma/schema.prisma',
  // engines: { binaryTargets: ['native'] }, // optional
};
