import React from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

type CodeExample = {
  label: string;
  language: string;
  code: string;
};

type CodeTabsProps = {
  groupId?: string;
  items: CodeExample[];
};

const CodeTabs: React.FC<CodeTabsProps> = ({groupId, items}) => {
  if (!items.length) {
    return null;
  }

  return (
    <Tabs groupId={groupId}>
      {items.map(({label, language, code}) => (
        <TabItem key={label} value={label} label={label}>
          <pre>
            <code className={`language-${language}`}>{code}</code>
          </pre>
        </TabItem>
      ))}
    </Tabs>
  );
};

export default CodeTabs;
