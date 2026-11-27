import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(apiBase: string) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', apiBase);
  return import('./images');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resizedPhoto', () => {
  it('asks the resize service for the card size at 1x and 2x', async () => {
    const { resizedPhoto } = await load('/api');
    const photo = resizedPhoto('https://cdn.example.org/a b.jpg?x=1', 'card');
    expect(photo).toEqual({
      src: '/api/v1/img?u=https%3A%2F%2Fcdn.example.org%2Fa+b.jpg%3Fx%3D1&w=440&h=330&fit=cover',
      srcSet:
        '/api/v1/img?u=https%3A%2F%2Fcdn.example.org%2Fa+b.jpg%3Fx%3D1&w=440&h=330&fit=cover 1x, /api/v1/img?u=https%3A%2F%2Fcdn.example.org%2Fa+b.jpg%3Fx%3D1&w=880&h=660&fit=cover 2x',
      width: 440,
      height: 330,
    });
  });

  it('only offers sizes the server allows', async () => {
    const { RESIZED_PRESETS } = await load('/api');
    const offered = new Set([
      '96x96',
      '192x192',
      '320x214',
      '640x428',
      '440x330',
      '880x660',
      '960x600',
      '1920x1200',
    ]);
    for (const { width, height } of Object.values(RESIZED_PRESETS)) {
      expect(offered.has(`${width}x${height}`)).toBe(true);
      expect(offered.has(`${width * 2}x${height * 2}`)).toBe(true);
    }
  });

  it('leaves bundled photos and an absent API alone', async () => {
    const withApi = await load('/api');
    expect(withApi.resizedPhoto('/images/p9-640.webp', 'card')).toBeNull();
    expect(
      withApi.resizedPhoto('data:image/png;base64,AAAA', 'thumb'),
    ).toBeNull();
    const withoutApi = await load('');
    expect(
      withoutApi.resizedPhoto('https://cdn.example.org/a.jpg', 'card'),
    ).toBeNull();
  });
});
