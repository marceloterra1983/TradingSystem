---
title: PlantUML Rendering Guide
sidebar_position: 10
tags: [diagrams, plantuml, visualization, shared]
domain: shared
type: guide
summary: Guide for rendering PlantUML diagrams in Docusaurus with examples and best practices
status: active
last_review: "2025-10-17"
---

# PlantUML Rendering in Docusaurus

This guide demonstrates how to render PlantUML diagrams directly in Docusaurus documentation.

## How It Works

PlantUML diagrams are automatically rendered using the `@akebifiky/remark-simple-plantuml` plugin. Simply use code blocks with the `plantuml` language tag.

## Example: Sequence Diagram

```plantuml
@startuml
participant User
participant "Data Capture" as DC
participant "API Gateway" as GW
participant "Order Manager" as OM

User -> DC: Subscribe WINZ25
DC -> DC: Connect ProfitDLL
DC --> User: Subscription OK

DC -> GW: Publish Tick (WebSocket)
GW -> GW: Validate Signal Request
GW -> OM: Forward Command

OM -> OM: Risk Validation
OM -> DC: Execute Order via ProfitDLL
DC --> OM: Order Confirmation
OM --> User: Position Update
@enduml
```

## Example: Component Diagram

```plantuml
@startuml
package "TradingSystem" {
  [Data Capture\n(.NET + ProfitDLL)] as DC
  [Order Manager\n(.NET + Risk)] as OM
  [API Gateway\n(FastAPI)] as GW
  [Dashboard\n(React)] as UI

  DC --> GW : WebSocket\n(Market Data)
  GW --> OM : HTTP\n(Orders)
  OM --> DC : DLL Calls\n(Execution)
  UI --> GW : REST API
}

database "PostgreSQL" as DB
database "Parquet Files" as PQ

DC --> PQ : Write Ticks
OM --> DB : Store Orders
@enduml
```

## Example: State Diagram

```plantuml
@startuml
[*] --> Disconnected

Disconnected --> Connecting : Initialize ProfitDLL
Connecting --> Connected : Connection OK
Connecting --> Disconnected : Connection Failed

Connected --> Subscribed : Subscribe Assets
Subscribed --> Streaming : Receiving Data

Streaming --> Processing : New Tick
Processing --> Streaming : Analysis Complete
Processing --> OrderPlaced : Risk OK
Processing --> Streaming : Risk Rejected

OrderPlaced --> PositionOpen : Order Filled
PositionOpen --> PositionClosed : Exit Signal

PositionClosed --> Streaming : Ready for Next Trade
@enduml
```

## Example: Class Diagram

```plantuml
@startuml
class OrderAggregate {
  +orderId: string
  +symbol: string
  +side: BUY | SELL
  +quantity: number
  +price: number
  +status: OrderStatus
  --
  +place()
  +cancel()
  +update()
}

class TradeAggregate {
  +tradeId: string
  +timestamp: Date
  +symbol: string
  +price: number
  +volume: number
  +aggressor: BUY | SELL
  --
  +validate()
}

class PositionAggregate {
  +positionId: string
  +symbol: string
  +quantity: number
  +avgPrice: number
  +unrealizedPnL: number
  --
  +update()
  +close()
}

OrderAggregate "1" --> "0..*" TradeAggregate : executes
PositionAggregate "1" --> "0..*" OrderAggregate : manages
@enduml
```

## Using Existing .puml Files

You can also embed existing `.puml` files by copying their content into markdown code blocks:



## Advantages

✅ **Automatic Rendering**: No need to manually generate SVG files
✅ **Version Control**: Source `.puml` files tracked in Git
✅ **Easy Updates**: Just edit the text, diagram updates automatically
✅ **Consistent Style**: All diagrams follow PlantUML standards
✅ **Documentation as Code**: Diagrams live alongside the docs

## Tips

1. **Keep diagrams simple**: Complex diagrams may be hard to read
2. **Use colors sparingly**: Too many colors can be distracting
3. **Add notes**: Explain complex parts with PlantUML notes
4. **Test locally**: Run Docusaurus dev server to preview diagrams
5. **Use skinparams**: Customize appearance with PlantUML skinparams

## Related Resources

- [PlantUML Official Documentation](https://plantuml.com/)
- [PlantUML Cheat Sheet](https://plantuml.com/guide)
- [All TradingSystem Diagrams](./README.md)
