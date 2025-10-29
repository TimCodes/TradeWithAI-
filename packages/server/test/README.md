# Test Directory

This directory contains all test files for the TradeWithAI server application.

## Structure

```
test/
├── modules/
│   └── trading/
│       └── services/
│           ├── kraken.service.spec.ts              # Unit tests for Kraken API service
│           ├── kraken.service.integration.spec.ts  # Integration tests for Kraken API
│           └── risk-management.service.spec.ts     # Unit tests for Risk Management service
└── README.md
```

## Test Types

### Unit Tests (`*.spec.ts`)
- Test individual components in isolation
- Mock external dependencies
- Fast execution
- Run with: `npm test`

### Integration Tests (`*.integration.spec.ts`)
- Test real API connections
- Require valid API credentials
- Slower execution
- May have rate limits
- Run with: `npm test -- kraken.service.integration.spec.ts`

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:cov
```

### Run specific test file
```bash
npm test -- kraken.service.spec.ts
```

### Run integration tests only
```bash
npm test -- --testPathPattern=integration
```

### Debug tests
```bash
npm run test:debug
```

## Test Configuration

Jest configuration is located in `package.json` under the `jest` key:
- Tests are discovered in both `src/` and `test/` directories
- Test files must match the pattern `*.spec.ts`
- Coverage reports are generated in `./coverage`

## Writing Tests

### Unit Test Example
```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceName],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Integration Test Example
```typescript
describe('ServiceName Integration Tests', () => {
  let service: ServiceName;

  beforeAll(async () => {
    // Setup with real dependencies
  });

  it('should connect to external API', async () => {
    const result = await service.externalCall();
    expect(result).toBeDefined();
  }, 10000); // Longer timeout for external calls
});
```

## Best Practices

1. **Organize by module**: Mirror the `src/` directory structure
2. **Name conventions**: 
   - Unit tests: `*.spec.ts`
   - Integration tests: `*.integration.spec.ts`
   - E2E tests: `*.e2e-spec.ts`
3. **Mock dependencies**: Use Jest mocks for external services in unit tests
4. **Use descriptive names**: Test descriptions should clearly state what is being tested
5. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
6. **Clean up**: Use `afterEach` and `afterAll` to clean up resources
7. **Avoid test interdependence**: Each test should be independent and isolated

## Coverage Goals

- Aim for >80% code coverage on critical business logic
- Focus on testing edge cases and error conditions
- Don't chase 100% coverage at the expense of meaningful tests

## CI/CD Integration

Tests are automatically run on:
- Pull request creation/updates
- Commits to main branch
- Before deployment to staging/production

## Environment Variables

Integration tests may require environment variables:
- `KRAKEN_API_KEY`: Kraken API key for integration tests
- `KRAKEN_API_SECRET`: Kraken API secret for integration tests
- `DATABASE_URL`: Test database connection string

See `.env.example` for required variables.
