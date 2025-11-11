import { IsString, IsNumber, IsObject, IsIn } from 'class-validator';

export class ShopTransactionDto {
  @IsString()
  @IsIn(['buy', 'sell'])
  action: 'buy' | 'sell';

  @IsString()
  itemId: string;

  @IsNumber()
  quantity: number;

  @IsObject()
  cost: {
    currency_id: string;
    value: number;
  };
}
