import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export enum RiskCheckStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WARNING = 'warning',
}

export class RiskCheckRequestDto {
  @IsString()
  userId: string;

  @IsString()
  symbol: string;

  @IsEnum(['buy', 'sell'])
  side: 'buy' | 'sell';

  @IsNumber()
  @Min(0)
  size: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(['market', 'limit'])
  @IsOptional()
  orderType?: 'market' | 'limit';
}

export class RiskCheckResponseDto {
  @IsEnum(RiskCheckStatus)
  status: RiskCheckStatus;

  @IsBoolean()
  approved: boolean;

  @IsString({ each: true })
  reasons: string[];

  @IsOptional()
  riskMetrics?: RiskMetrics;

  @IsOptional()
  suggestions?: string[];
}

export class RiskMetrics {
  @IsNumber()
  positionSizeUsd: number;

  @IsNumber()
  portfolioExposurePct: number;

  @IsNumber()
  riskAmountUsd: number;

  @IsNumber()
  riskPct: number;

  @IsNumber()
  maxPositionSize: number;

  @IsNumber()
  availableBalance: number;

  @IsNumber()
  currentPositionsCount: number;

  @IsNumber()
  currentDrawdownPct: number;

  @IsNumber()
  dailyLossUsd: number;

  @IsBoolean()
  exceedsPositionLimit: boolean;

  @IsBoolean()
  exceedsExposureLimit: boolean;

  @IsBoolean()
  exceedsDrawdownLimit: boolean;

  @IsBoolean()
  exceedsDailyLossLimit: boolean;
}

export class UpdateRiskSettingsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPositionSize?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPositionValueUsd?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxPortfolioExposure?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxPositionsCount?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultStopLossPct?: number;

  @IsBoolean()
  @IsOptional()
  enableAutomaticStopLoss?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxDrawdownPct?: number;

  @IsBoolean()
  @IsOptional()
  enableDrawdownProtection?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  riskPerTradePct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDailyLossUsd?: number;

  @IsBoolean()
  @IsOptional()
  enableRiskChecks?: boolean;
}

export class PositionSizeCalculationDto {
  @IsString()
  userId: string;

  @IsString()
  symbol: string;

  @IsNumber()
  @Min(0)
  entryPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stopLossPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  riskPercentage?: number; // Override default risk per trade
}

export class PositionSizeResponseDto {
  @IsNumber()
  recommendedSize: number;

  @IsNumber()
  maxSize: number;

  @IsNumber()
  riskAmount: number;

  @IsNumber()
  positionValue: number;

  @IsString()
  reasoning: string;
}
