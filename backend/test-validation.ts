/**
 * Quick validation tests for backend implementation
 * These are smoke tests to verify basic functionality without database
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

// Import DTOs
import { RegisterDto, LoginDto } from './src/auth/dto';
import { CreateStoryDto } from './src/stories/dto';
import { CreateSessionDto, UpdateStateDto } from './src/sessions/dto';
import { ValidatePuzzleDto } from './src/puzzles/dto';
import { ShopTransactionDto } from './src/shop/dto';

console.log('🧪 Starting Backend Validation Tests...\n');

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<boolean> | boolean) {
  try {
    const result = await fn();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

async function validateDto(dto: any): Promise<boolean> {
  const errors = await validate(dto);
  return errors.length === 0;
}

// Test 1: Auth DTOs validation
test('Auth DTOs: Valid RegisterDto', async () => {
  const dto = plainToClass(RegisterDto, {
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123'
  });
  return await validateDto(dto);
});

test('Auth DTOs: Invalid RegisterDto (missing email)', async () => {
  const dto = plainToClass(RegisterDto, {
    username: 'testuser',
    password: 'password123'
  });
  const errors = await validate(dto);
  return errors.length > 0; // Should have errors
});

test('Auth DTOs: Valid LoginDto', async () => {
  const dto = plainToClass(LoginDto, {
    email: 'test@example.com',
    password: 'password123'
  });
  return await validateDto(dto);
});

// Test 2: Story DTOs validation
test('Story DTOs: Valid CreateStoryDto', async () => {
  const dto = plainToClass(CreateStoryDto, {
    title: 'Test Story',
    language: 'hu',
    version: '1.0',
    content: {
      meta: { title: 'Test', language: 'hu', version: '1.0' },
      start_node: 'start',
      nodes: {}
    }
  });
  return await validateDto(dto);
});

// Test 3: Session DTOs validation
test('Session DTOs: Valid CreateSessionDto', async () => {
  const dto = plainToClass(CreateSessionDto, {
    storyId: 'story-123',
    userId: 'user-123'
  });
  return await validateDto(dto);
});

test('Session DTOs: Valid UpdateStateDto', async () => {
  const dto = plainToClass(UpdateStateDto, {
    state: {
      current_node: 'node1',
      inventory: {},
      currencies: {},
      stats: {},
      flags: {},
      puzzles: {},
      timers: {}
    }
  });
  return await validateDto(dto);
});

// Test 4: Puzzle DTOs validation
test('Puzzle DTOs: Valid ValidatePuzzleDto', async () => {
  const dto = plainToClass(ValidatePuzzleDto, {
    puzzleId: 'puzzle-1',
    answer: { selected: 0 },
    timeSpentMs: 5000
  });
  return await validateDto(dto);
});

// Test 5: Shop DTOs validation
test('Shop DTOs: Valid ShopTransactionDto (buy)', async () => {
  const dto = plainToClass(ShopTransactionDto, {
    action: 'buy',
    itemId: 'item-1',
    quantity: 1,
    cost: { currency_id: 'gold', value: 100 }
  });
  return await validateDto(dto);
});

test('Shop DTOs: Valid ShopTransactionDto (sell)', async () => {
  const dto = plainToClass(ShopTransactionDto, {
    action: 'sell',
    itemId: 'item-1',
    quantity: 1,
    cost: { currency_id: 'gold', value: 50 }
  });
  return await validateDto(dto);
});

test('Shop DTOs: Invalid action', async () => {
  const dto = plainToClass(ShopTransactionDto, {
    action: 'trade', // Invalid action
    itemId: 'item-1',
    quantity: 1,
    cost: { currency_id: 'gold', value: 50 }
  });
  const errors = await validate(dto);
  return errors.length > 0; // Should have errors
});

// Test 6: Module imports
test('Modules: Auth module imports', () => {
  try {
    require('./src/auth/auth.module');
    require('./src/auth/auth.service');
    require('./src/auth/auth.controller');
    return true;
  } catch (error) {
    return false;
  }
});

test('Modules: Stories module imports', () => {
  try {
    require('./src/stories/stories.module');
    require('./src/stories/stories.service');
    require('./src/stories/stories.controller');
    return true;
  } catch (error) {
    return false;
  }
});

test('Modules: Sessions module imports', () => {
  try {
    require('./src/sessions/sessions.module');
    require('./src/sessions/sessions.service');
    require('./src/sessions/sessions.controller');
    return true;
  } catch (error) {
    return false;
  }
});

test('Modules: Puzzles module imports', () => {
  try {
    require('./src/puzzles/puzzles.module');
    require('./src/puzzles/puzzles.service');
    require('./src/puzzles/puzzles.controller');
    return true;
  } catch (error) {
    return false;
  }
});

test('Modules: Shop module imports', () => {
  try {
    require('./src/shop/shop.module');
    require('./src/shop/shop.service');
    require('./src/shop/shop.controller');
    return true;
  } catch (error) {
    return false;
  }
});

// Test 7: Prisma schema validation
test('Prisma: Schema file exists', () => {
  const fs = require('fs');
  return fs.existsSync('./prisma/schema.prisma');
});

test('Prisma: Schema has required models', () => {
  const fs = require('fs');
  const schema = fs.readFileSync('./prisma/schema.prisma', 'utf-8');
  return schema.includes('model User') &&
         schema.includes('model Story') &&
         schema.includes('model GameSession') &&
         schema.includes('model PuzzleAttempt') &&
         schema.includes('model ShopTransaction') &&
         schema.includes('model AnalyticsEvent');
});

// Run tests and print summary
setTimeout(() => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Test Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total:  ${passed + failed}`);
  console.log(`   🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(50)}\n`);

  if (failed === 0) {
    console.log('🎉 All validation tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review the output above.\n');
    process.exit(1);
  }
}, 1000);
