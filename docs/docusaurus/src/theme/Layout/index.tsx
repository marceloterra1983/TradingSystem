import React from 'react';
import Layout from '@theme-original/Layout';
import CookiesBanner from '../../components/CookiesBanner';

export default function CustomLayout(props: any) {
  return (
    <>
      <Layout {...props} />
      <CookiesBanner />
    </>
  );
}



