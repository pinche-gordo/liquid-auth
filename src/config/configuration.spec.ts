import configFactory from './configuration.js';
import configFixture from '../__fixtures__/configuration.fixture.json';
describe('configuration', () => {
  it('should return the configuration', () => {
    delete process.env.NODE_ENV;
    expect(configFactory()).toEqual({
      ...configFixture,
      env: 'development',
      hostname: 'localhost',
      origin: 'http://localhost',
      session: {
        ...configFixture.session,
        maxAgeMs: 10 * 60 * 1000,
        mobileLongMaxAgeMs: 180 * 24 * 60 * 60 * 1000,
      },
    });
    process.env.NODE_ENV = 'test';
  });
});
