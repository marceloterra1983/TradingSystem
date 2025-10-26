declare module '@docusaurus/Link' {
  import type React from 'react';
  const Link: React.ComponentType<
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {to: string}
  >;
  export default Link;
}

declare module '@theme/Admonition' {
  import type React from 'react';
  type Props = {
    type: 'info' | 'warning' | 'danger' | 'success';
    title?: string;
    children?: React.ReactNode;
  };
  const Admonition: React.FC<Props>;
  export default Admonition;
}

declare module '@theme/Tabs' {
  import type React from 'react';
  type Props = {
    groupId?: string;
    children?: React.ReactNode;
  };
  const Tabs: React.FC<Props>;
  export default Tabs;
}

declare module '@theme/TabItem' {
  import type React from 'react';
  type Props = {
    value: string;
    label: string;
    children?: React.ReactNode;
  };
  const TabItem: React.FC<Props>;
  export default TabItem;
}
