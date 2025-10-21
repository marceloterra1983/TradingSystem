import React from 'react';
import DefaultTabs from '@theme/Tabs';
import DefaultTabItem from '@theme/TabItem';

/**
 * Custom Tabs component for multi-language code examples
 *
 * Usage:
 * ```tsx
 * <Tabs>
 *   <TabItem value="python" label="Python">
 *     ```python
 *     print("Hello")
 *     ```
 *   </TabItem>
 *   <TabItem value="csharp" label="C#">
 *     ```csharp
 *     Console.WriteLine("Hello");
 *     ```
 *   </TabItem>
 * </Tabs>
 * ```
 */

export { DefaultTabs as Tabs, DefaultTabItem as TabItem };
