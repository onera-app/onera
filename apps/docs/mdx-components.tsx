import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Mermaid } from '@/components/mermaid';
import type { ReactElement } from 'react';

function Pre({ children, ...props }: React.ComponentProps<'pre'>) {
  // Check if this is a mermaid code block
  const child = children as ReactElement<{ className?: string; children?: string }>;
  
  if (child?.props?.className === 'language-mermaid') {
    const code = child.props.children;
    if (typeof code === 'string') {
      return <Mermaid chart={code.trim()} />;
    }
  }

  // Default pre rendering
  const DefaultPre = defaultMdxComponents.pre;
  if (DefaultPre) {
    return <DefaultPre {...props}>{children}</DefaultPre>;
  }
  return <pre {...props}>{children}</pre>;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    pre: Pre,
    ...components,
  };
}
