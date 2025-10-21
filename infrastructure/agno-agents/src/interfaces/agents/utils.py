from __future__ import annotations

from typing import Any, Awaitable, Callable, Dict, Protocol

ToolCallable = Callable[..., Awaitable[Any]]


class SupportsToolbox(Protocol):
    def add_tool(self, name: str, description: str, coroutine: ToolCallable) -> None: ...

    async def run_tool(self, name: str, **kwargs: Any) -> Any: ...


def register_async_tool(agent: Any, name: str, description: str, func: ToolCallable) -> None:
    if hasattr(agent, "add_tool"):
        try:
            agent.add_tool(name=name, description=description, coroutine=func)  # type: ignore[attr-defined]
            return
        except TypeError:
            pass
    if hasattr(agent, "register_tool"):
        try:
            agent.register_tool(name=name, func=func, description=description)  # type: ignore[attr-defined]
            return
        except TypeError:
            pass

    tools: Dict[str, ToolCallable] = getattr(agent, "_agnostic_tools", {})
    tools[name] = func
    setattr(agent, "_agnostic_tools", tools)


async def invoke_agent_tool(agent: Any, name: str, **kwargs: Any) -> Any:
    if hasattr(agent, "run_tool"):
        return await agent.run_tool(name, **kwargs)  # type: ignore[attr-defined]
    if hasattr(agent, "call_tool"):
        return await agent.call_tool(name=name, **kwargs)  # type: ignore[attr-defined]

    tools: Dict[str, ToolCallable] = getattr(agent, "_agnostic_tools", {})
    if name not in tools:
        raise AttributeError(f"Agent does not expose tool '{name}'")
    return await tools[name](**kwargs)
