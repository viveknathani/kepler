import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ENVIRONMENT: z.enum(['dev', 'prod', 'test']).default('dev'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.string().default('debug'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin'),
  BY_PASS_AUTH_CLERK_USER_ID: z.string().default(''),
  CLERK_SECRET_KEY: z.string().default(''),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
  GITHUB_TOKEN: z.string().default(''),
  LANGFUSE_SECRET_KEY: z.string().default(''),
  LANGFUSE_PUBLIC_KEY: z.string().default(''),
  LANGFUSE_BASEURL: z.string().default('https://cloud.langfuse.com'),
});

export default schema.parse(process.env);
