import '@testing-library/jest-dom';
import fs from 'fs';
import { render } from '@testing-library/react';
import { TextEncoder } from 'util';
import { QrCode } from '.';

// jsdom has no TextEncoder; every browser does, and `qrcode` encodes with it.
Object.assign(global, { TextEncoder });

jest.mock('@/public/svgs/logo-icon.svg', () => {
  const Logo = (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="qr-logo" {...props} />;
  return Logo;
});

const URL = 'https://pharmacy.qwiva.io/r/Dm-Ucz7ErWxUd9xgSe1csg0e3pR2wrXvsKiAiR';

describe('QrCode', () => {
  it('draws the modules as one path, three finder eyes and the logo', () => {
    const { container, getByTestId } = render(<QrCode value={URL} title="Scan me" />);
    const svg = container.querySelector('svg[role="img"]');

    expect(svg).toHaveAttribute('aria-label', 'Scan me');
    // Background, module path, 3 × (ring + pupil), logo badge.
    expect(container.querySelectorAll('svg[role="img"] > path')).toHaveLength(1);
    expect(container.querySelectorAll('svg[role="img"] > g')).toHaveLength(4);
    expect(getByTestId('qr-logo')).toBeInTheDocument();

    // QR_DUMP=<file> writes the rendered SVG out, to rasterise and decode it
    // with a real decoder outside the test.
    if (process.env.QR_DUMP && svg) fs.writeFileSync(process.env.QR_DUMP, svg.outerHTML);
  });

  it('leaves the centre clear without a logo', () => {
    const { container, queryByTestId } = render(<QrCode value={URL} withLogo={false} />);

    expect(queryByTestId('qr-logo')).not.toBeInTheDocument();
    expect(container.querySelectorAll('svg[role="img"] > g')).toHaveLength(3);
  });

  it('gives each code its own gradient id', () => {
    const { container } = render(
      <>
        <QrCode value={URL} />
        <QrCode value={URL} />
      </>
    );
    const ids = Array.from(container.querySelectorAll('linearGradient')).map((g) => g.id);

    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => !id.includes(':'))).toBe(true);
  });
});
