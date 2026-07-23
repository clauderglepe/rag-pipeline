import { env } from 'process';
import {z} from 'zod';

const envSchema = z.object({
  OLLAMA_BASE_URL:z.url(),
  OLLAMA_EMBEDDING_MODEL:z.string().min(1),
  EMBEDDING_BATCH_SIZE:z.coerce.number().int().min(1).max(500)
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validate(config: Record<string,unknown>): EnvironmentVariables {
  const result = envSchema.safeParse(config);
  if(!result.success){
    throw new Error(`Configuración de entorno inválida:\n${result.error.toString()}`);
  }
  return result.data;
}