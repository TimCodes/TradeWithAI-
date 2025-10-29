import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataService } from './services/market-data.service';
import { MarketDataController } from './controllers/market-data.controller';
import { OHLCVEntity } from './entities/ohlcv.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OHLCVEntity]),
  ],
  controllers: [MarketDataController],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
