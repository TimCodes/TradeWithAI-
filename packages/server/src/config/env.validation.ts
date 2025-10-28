import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  validateSync,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Environment Variables Validation Schema
 * Ensures all required environment variables are present and valid
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  // Database Configuration
  @IsString()
  @IsOptional()
  DB_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DB_USERNAME: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = 'password';

  @IsString()
  @IsOptional()
  DB_DATABASE: string = 'alpha_arena';

  // Redis Configuration
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // Kraken API Configuration
  @IsString()
  KRAKEN_API_KEY: string;

  @IsString()
  KRAKEN_API_SECRET: string;

  // LLM Provider API Keys (at least one required for full functionality)
  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  ANTHROPIC_API_KEY?: string;

  @IsString()
  @IsOptional()
  GEMINI_API_KEY?: string;

  @IsString()
  @IsOptional()
  DEEPSEEK_API_KEY?: string;

  // JWT Configuration
  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'your-super-secret-jwt-key-change-in-production';

  @IsNumber()
  @IsOptional()
  @Min(300)
  JWT_EXPIRATION: number = 3600;

  // Server Configuration
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;
}

/**
 * Validates environment variables against the schema
 * @param config - Raw environment variables object
 * @returns Validated and transformed environment variables
 * @throws Error if validation fails
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Unknown error';
        return `${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `Environment variable validation failed:\n${errorMessages}\n\n` +
        `Please ensure all required environment variables are set in your .env file.\n` +
        `Required variables:\n` +
        `  - KRAKEN_API_KEY: Your Kraken API key\n` +
        `  - KRAKEN_API_SECRET: Your Kraken API secret\n` +
        `Optional but recommended:\n` +
        `  - OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY\n` +
        `  - JWT_SECRET (highly recommended for production)\n`,
    );
  }

  return validatedConfig;
}
