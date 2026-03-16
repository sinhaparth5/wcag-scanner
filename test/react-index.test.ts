describe('react barrel exports', () => {
  it('should export the expected React entry points', async () => {
    const reactIndex = await import('../src/react/index');

    expect(reactIndex.WcagDevOverlay).toBeDefined();
    expect(reactIndex.scanBrowserPage).toBeDefined();
    expect(reactIndex.initWcagOverlay).toBeDefined();
    expect(reactIndex.getAiSuggestion).toBeDefined();
    expect(reactIndex.RULE_PRESETS.full).toContain('backgroundImages');
    expect(typeof reactIndex.resolveRuleNames).toBe('function');
  });
});
