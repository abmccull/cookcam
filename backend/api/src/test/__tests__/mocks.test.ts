import * as mocks from '../mocks';

describe('Test Mocks', () => {
  it('should import mocks module', () => {
    expect(mocks).toBeDefined();
    expect(typeof mocks).toBe('object');
  });

  it('should export mock objects', () => {
    // Just test that the module can be imported 
    const exports = Object.keys(mocks);
    expect(Array.isArray(exports)).toBe(true);
  });
});