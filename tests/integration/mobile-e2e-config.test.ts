import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('mobile e2e config', () => {
  it('android splits api and ws base urls', () => {
    const gradle = readFileSync('apps/android/app/build.gradle.kts', 'utf-8');
    const locator = readFileSync('apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt', 'utf-8');
    expect(gradle).toContain('buildConfigField("String", "API_BASE_URL"');
    expect(gradle).toContain('buildConfigField("String", "WS_BASE_URL"');
    expect(locator).toContain('BuildConfig.API_BASE_URL');
    expect(locator).toContain('BuildConfig.WS_BASE_URL');
  });

  it('ios documents the same default entrypoints', () => {
    const config = readFileSync('apps/ios/JianliaoIOS/App/AppConfig.swift', 'utf-8');
    const readme = readFileSync('apps/ios/README.md', 'utf-8');
    expect(config).toContain('http://127.0.0.1/api');
    expect(config).toContain('http://127.0.0.1');
    expect(readme).toContain('http://127.0.0.1/api');
    expect(readme).toContain('http://127.0.0.1');
  });
});
