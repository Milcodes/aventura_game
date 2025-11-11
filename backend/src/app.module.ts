import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StoriesModule } from './stories/stories.module';
import { SessionsModule } from './sessions/sessions.module';
import { PuzzlesModule } from './puzzles/puzzles.module';
import { ShopModule } from './shop/shop.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StoriesModule,
    SessionsModule,
    PuzzlesModule,
    ShopModule,
  ],
})
export class AppModule {}
