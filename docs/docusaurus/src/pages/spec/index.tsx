import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

const SpecViewerPage = () => {
  const portalUrl = useBaseUrl('/spec/portal.html');

  return (
    <Layout
      title="API Specifications"
      description="Portal interativo com as especificações OpenAPI & AsyncAPI do TradingSystem"
    >
      <main className="container margin-vert--lg">
        <header className="margin-bottom--lg">
          <h1>API Specifications</h1>
          <p className="hero__subtitle">
            Utilize o visualizador abaixo para explorar a documentação interativa das APIs REST (OpenAPI)
            e dos canais em tempo real (AsyncAPI). O portal também disponibiliza download direto dos artefatos.
          </p>
        </header>

        <section className="margin-bottom--lg">
          <div
            style={{
              borderRadius: 'var(--ifm-global-radius)',
              overflow: 'hidden',
              border: '1px solid var(--ifm-color-emphasis-200)',
              minHeight: '75vh',
            }}
          >
            <iframe
              title="TradingSystem Spec Portal"
              src={portalUrl}
              style={{ width: '100%', height: '75vh', border: 'none' }}
              loading="lazy"
            />
          </div>
        </section>

        <section>
          <h2>Downloads rápidos</h2>
          <p>
            Prefere trabalhar com os arquivos diretamente? Baixe as versões mais recentes das especificações ou
            acesse o relatório de integridade gerado pelo pipeline de validação.
          </p>
          <ul>
            <li>
              OpenAPI (REST): <code>spec/openapi.yaml</code>
            </li>
            <li>
              AsyncAPI (WebSockets): <code>spec/asyncapi.yaml</code>
            </li>
            <li>
              Status / Health report: <code>spec/status.json</code>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
};

export default SpecViewerPage;
