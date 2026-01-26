import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <Image
          src="/favicon.svg"
          alt="Onera"
          width={24}
          height={24}
          className="rounded"
        />
        <span>Onera Docs</span>
      </div>
    ),
  },
  links: [
    {
      text: 'Documentation',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: 'E2EE Whitepaper',
      url: '/docs/whitepaper',
    },
  ],
};
