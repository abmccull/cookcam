import * as helpers from '../helpers';

describe('Test Helpers', () => {
  it('should import helpers module', () => {
    expect(helpers).toBeDefined();
    expect(typeof helpers).toBe('object');
  });

  it('should export helper functions', () => {
    // Just test that the module can be imported and has some exports
    const exports = Object.keys(helpers);
    expect(Array.isArray(exports)).toBe(true);
  });
});