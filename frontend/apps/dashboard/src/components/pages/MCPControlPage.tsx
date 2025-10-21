export function MCPControlPage() {
  return (
    <div className="h-[calc(100vh-160px)] w-full">
      <iframe
        src="http://localhost:3847/"
        title="MCP Control"
        className="h-full w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
      />
    </div>
  );
}

export default MCPControlPage;
