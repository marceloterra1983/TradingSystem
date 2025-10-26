import React from 'react';
import Link from '@docusaurus/Link';

type RelatedLink = {
  label: string;
  to: string;
};

type RelatedProps = {
  title?: string;
  items: RelatedLink[];
};

const Related: React.FC<RelatedProps> = ({title = 'Related reading', items}) => {
  if (!items.length) {
    return null;
  }

  return (
    <aside className="related">
      <h3>{title}</h3>
      <ul>
        {items.map(({label, to}) => (
          <li key={to}>
            <Link to={to}>{label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Related;
