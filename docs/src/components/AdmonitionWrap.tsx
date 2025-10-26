import React from 'react';
import Admonition from '@theme/Admonition';

type AdmonitionWrapProps = {
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  children: React.ReactNode;
};

const AdmonitionWrap: React.FC<AdmonitionWrapProps> = ({type, title, children}) => (
  <Admonition type={type} title={title}>
    {children}
  </Admonition>
);

export default AdmonitionWrap;
