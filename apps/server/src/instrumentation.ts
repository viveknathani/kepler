import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import config from './config';

if (config.LANGFUSE_PUBLIC_KEY && config.LANGFUSE_SECRET_KEY) {
  const provider = new NodeTracerProvider({ spanProcessors: [new LangfuseSpanProcessor()] });
  provider.register();
}
