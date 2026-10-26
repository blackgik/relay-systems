import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Relay — Peer-to-peer logistics',
    short_name: 'Relay',
    description: 'Travelers carry packages along routes they already take.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0B3B4B',
    icons: [
      {
        src: '/svgs/relay-mark.svg',
        sizes: '48x48',
        type: 'image/svg+xml',
      },
    ],
  };
}
