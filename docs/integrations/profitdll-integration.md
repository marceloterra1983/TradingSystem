---
title: ProfitDLL Integration Guide
sidebar_position: 1
tags: [documentation]
domain: shared
type: reference
summary: ProfitDLL Integration Guide
status: active
last_review: 2025-10-22
---

# ProfitDLL Integration Guide

**Version:** 1.0
**Author:** Marcelo Terra
**Last Updated:** January 2025
**Status:** Active

---

## Overview

This document provides comprehensive guidance for integrating with Nelogica's **ProfitDLL** (Data Solution) to capture real-time market data and execute orders.

### Key Information

- **DLL Version:** 64-bit only
- **Platform:** Windows 10/11 x64
- **Language:** C# (.NET 8.0)
- **License Required:** Profit Pro with Data Solution active
- **Build Mode:** x64 (mandatory)

---

## 1. Installation & Setup

### 1.1 Prerequisites

```powershell
# Check Windows version
winver  # Must be x64

# Check .NET SDK
dotnet --version  # Must be 8.0+

# Verify ProfitDLL location
ls "DOCS_PRFITDLL/DLLs/Win64/ProfitDLL.dll"
```

### 1.2 Project Configuration

```xml
<!-- TradingSystem.DataCapture.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Platforms>x64</Platforms>
    <PlatformTarget>x64</PlatformTarget>
    <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="WebSocketSharp-netstandard" Version="1.0.1" />
    <PackageReference Include="Serilog" Version="3.1.1" />
  </ItemGroup>

  <!-- Copy ProfitDLL to output -->
  <ItemGroup>
    <None Update="ProfitDLL.dll">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
  </ItemGroup>
</Project>
```

### 1.3 Build Command

```bash
# Always build in x64
dotnet build -c Release --arch x64
```

---

## 2. Connection & Authentication

### 2.1 Initialization

```csharp
using System.Runtime.InteropServices;

public class ProfitDllWrapper
{
    private const string DLL_PATH = "ProfitDLL.dll";

    [DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
    public static extern int DLLInitializeLogin(
        [MarshalAs(UnmanagedType.LPWStr)] string activationKey,
        [MarshalAs(UnmanagedType.LPWStr)] string username,
        [MarshalAs(UnmanagedType.LPWStr)] string password,
        TStateCallback stateCallback,
        TNewTradeCallback tradeCallback,
        TNewDailyCallback dailyCallback,
        TOfferBookCallback offerBookCallback,
        TAccountCallback accountCallback,
        TNewDailyCallback newDailyCallback,
        THistoryCallback historyCallback,
        TOfferBookCallback offerBookCallbackV2,
        TAdjustHistoryCallback adjustCallback,
        TProgressCallback progressCallback,
        TTinyBookCallback tinyBookCallback);

    // Initialize connection
    public int Connect(string key, string user, string password)
    {
        return DLLInitializeLogin(
            key, user, password,
            _stateCallback,      // Connection state
            _tradeCallback,      // Trade events
            _dailyCallback,      // Daily candles
            _offerBookCallback,  // Order book
            _accountCallback,    // Account info
            null, null, null, null, null);
    }
}
```

### 2.2 Connection States

```csharp
public delegate void TStateCallback(int nType, int nResult);

// State types
public enum StateType
{
    Login = 0,      // Login status
    Broker = 1,     // Broker connection
    Market = 2,     // Market data connection
    Activation = 3  // License activation
}

// Implementation
private static void StateCallback(int nType, int nResult)
{
    switch (nType)
    {
        case 0: // Login
            if (nResult == 0)
                Console.WriteLine("✅ Login successful");
            else
                Console.WriteLine($"❌ Login failed: {nResult}");
            break;

        case 1: // Broker
            if (nResult == 5)
                Console.WriteLine("✅ Broker connected");
            else
                Console.WriteLine($"⚠️  Broker status: {nResult}");
            break;

        case 2: // Market
            if (nResult == 4)
            {
                _isMarketConnected = true;
                Console.WriteLine("✅ Market connected");
            }
            else
                Console.WriteLine($"⚠️  Market status: {nResult}");
            break;

        case 3: // Activation
            if (nResult == 0)
            {
                _isActivated = true;
                Console.WriteLine("✅ License activated");
            }
            else
                Console.WriteLine($"❌ Activation failed: {nResult}");
            break;
    }
}
```

### 2.3 Error Codes

```csharp
public static class NLErrorCodes
{
    public const int NL_OK = 0x00000000;
    public const int NL_INTERNAL_ERROR = -2147483647;
    public const int NL_NOT_INITIALIZED = -2147483646;
    public const int NL_INVALID_ARGS = -2147483645;
    public const int NL_WAITING_SERVER = -2147483644;
    public const int NL_NO_LOGIN = -2147483643;
    public const int NL_NO_LICENSE = -2147483642;
    public const int NL_INVALID_TICKER = -2147483618;

    public static string GetErrorMessage(int code)
    {
        return code switch
        {
            NL_OK => "Success",
            NL_INTERNAL_ERROR => "Internal error",
            NL_NOT_INITIALIZED => "DLL not initialized",
            NL_INVALID_ARGS => "Invalid arguments",
            NL_NO_LOGIN => "No login found",
            NL_NO_LICENSE => "No license found",
            NL_INVALID_TICKER => "Invalid ticker symbol",
            _ => $"Unknown error: {code}"
        };
    }
}
```

---

## 3. Market Data Subscription

### 3.1 Subscribe to Ticker

```csharp
[DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
public static extern int SubscribeTicker(
    [MarshalAs(UnmanagedType.LPWStr)] string symbol,
    [MarshalAs(UnmanagedType.LPWStr)] string exchange);

// Usage
public void SubscribeToAsset(string symbol, string exchange)
{
    // Wait for connection
    if (!_isMarketConnected || !_isActivated)
    {
        Console.WriteLine("⚠️  Not connected. Waiting...");
        return;
    }

    int result = SubscribeTicker(symbol, exchange);

    if (result == NLErrorCodes.NL_OK)
        Console.WriteLine($"✅ Subscribed to {symbol}:{exchange}");
    else
        Console.WriteLine($"❌ Subscribe failed: {NLErrorCodes.GetErrorMessage(result)}");
}
```

### 3.2 Trade Callback

```csharp
[UnmanagedFunctionPointer(CallingConvention.StdCall)]
public delegate void TConnectorTradeCallback(
    TConnectorAssetIdentifier assetId,
    IntPtr pTrade,
    uint flags);

// Trade data structure
[StructLayout(LayoutKind.Sequential)]
public struct TConnectorTrade
{
    public int Version;
    public double Price;
    public long Quantity;
    public long TradeNumber;
    public SYSTEMTIME Time;
    public byte Aggressor;  // 0=Buyer, 1=Seller
}

// Implementation
private static void TradeCallback(
    TConnectorAssetIdentifier assetId,
    IntPtr pTrade,
    uint flags)
{
    var trade = new TConnectorTrade { Version = 0 };

    if (TranslateTrade(pTrade, ref trade))
    {
        var tradeData = new
        {
            Symbol = assetId.Ticker,
            Price = trade.Price,
            Volume = trade.Quantity,
            Aggressor = trade.Aggressor == 0 ? "B" : "S",
            Timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds()
        };

        // Send to WebSocket
        _websocketPublisher.Publish(JsonSerializer.Serialize(tradeData));

        // Log
        _logger.Information(
            "Trade: {Symbol} {Price} {Volume} {Aggressor}",
            tradeData.Symbol, tradeData.Price,
            tradeData.Volume, tradeData.Aggressor);
    }
}
```

### 3.3 Price Depth (Order Book)

```csharp
[DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
public static extern int SubscribePriceDepth(
    ref TConnectorAssetIdentifier assetId);

[UnmanagedFunctionPointer(CallingConvention.StdCall)]
public delegate void TConnectorPriceDepthCallback(
    TConnectorAssetIdentifier assetId,
    byte side,      // 0=Buy, 1=Sell
    int position,
    byte updateType // 0=Add, 1=Edit, 2=Delete, 3=Insert, 4=FullBook
);

private static void PriceDepthCallback(
    TConnectorAssetIdentifier assetId,
    byte side,
    int position,
    byte updateType)
{
    string sideName = side == 0 ? "Buy" : "Sell";

    switch (updateType)
    {
        case 1: // Edit
            var priceGroup = new TConnectorPriceGroup { Version = 0 };
            if (GetPriceGroup(ref assetId, side, position, ref priceGroup) == NLErrorCodes.NL_OK)
            {
                Console.WriteLine(
                    $"Book Update: {assetId.Ticker} {sideName} " +
                    $"Price={priceGroup.Price} Qty={priceGroup.Quantity}");
            }
            break;

        case 4: // FullBook
            int count = GetPriceDepthSideCount(ref assetId, side);
            Console.WriteLine($"Full Book: {assetId.Ticker} {sideName} Count={count}");
            break;
    }
}
```

---

## 4. Order Execution

### 4.1 Send Order

```csharp
[DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
public static extern int SendOrder(ref TConnectorSendOrder order);

[StructLayout(LayoutKind.Sequential)]
public struct TConnectorSendOrder
{
    public int Version;
    public TConnectorAccountIdentifier AccountID;
    public TConnectorAssetIdentifier AssetID;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
    public string Password;
    public byte OrderType;    // 0=Market, 1=Limit, 2=Stop
    public byte OrderSide;    // 0=Buy, 1=Sell
    public double Price;      // -1 for market orders
    public double StopPrice;
    public long Quantity;
}

// Usage
public int PlaceMarketOrder(
    string symbol,
    string exchange,
    string side,
    int quantity,
    string accountId,
    string password)
{
    var order = new TConnectorSendOrder
    {
        Version = 1,
        OrderType = 0, // Market
        OrderSide = side == "BUY" ? (byte)0 : (byte)1,
        Price = -1,    // Market order
        StopPrice = -1,
        Quantity = quantity,
        Password = password,
        AccountID = new TConnectorAccountIdentifier
        {
            Version = 0,
            BrokerID = 1171,
            AccountID = accountId,
            SubAccountID = ""
        },
        AssetID = new TConnectorAssetIdentifier
        {
            Version = 0,
            Ticker = symbol,
            Exchange = exchange,
            FeedType = 0
        }
    };

    int profitId = SendOrder(ref order);

    if (profitId > 0)
        Console.WriteLine($"✅ Order placed: ProfitID={profitId}");
    else
        Console.WriteLine($"❌ Order failed: {NLErrorCodes.GetErrorMessage(profitId)}");

    return profitId;
}
```

### 4.2 Order Callback

```csharp
[UnmanagedFunctionPointer(CallingConvention.StdCall)]
public delegate void TConnectorOrderCallback(
    TConnectorOrderIdentifier orderId);

private static void OrderCallback(TConnectorOrderIdentifier orderId)
{
    var order = new TConnectorOrderOut
    {
        Version = 0,
        OrderID = orderId
    };

    // First call to get lengths
    if (GetOrderDetails(ref order) == NLErrorCodes.NL_OK)
    {
        // Allocate space for strings
        order.AssetID.Ticker = new string(' ', order.AssetID.TickerLength);
        order.AssetID.Exchange = new string(' ', order.AssetID.ExchangeLength);
        order.TextMessage = new string(' ', order.TextMessageLength);

        // Second call to get actual data
        if (GetOrderDetails(ref order) == NLErrorCodes.NL_OK)
        {
            Console.WriteLine(
                $"Order Update: {order.AssetID.Ticker} " +
                $"Status={order.OrderStatus} " +
                $"Qty={order.TradedQuantity}/{order.TotalQuantity} " +
                $"Price={order.Price}");

            // Notify position tracker
            if (order.OrderStatus == 2) // FILLED
            {
                _positionTracker.UpdatePosition(order);
            }
        }
    }
}
```

### 4.3 Cancel Order

```csharp
[DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
public static extern int SendCancelOrderV2(ref TConnectorCancelOrder cancelOrder);

public int CancelOrder(string clOrderId, string accountId, string password)
{
    var cancelOrder = new TConnectorCancelOrder
    {
        Version = 0,
        Password = password,
        OrderID = new TConnectorOrderIdentifier
        {
            Version = 0,
            LocalOrderID = -1,
            ClOrderID = clOrderId
        },
        AccountID = new TConnectorAccountIdentifier
        {
            Version = 0,
            BrokerID = 1171,
            AccountID = accountId
        }
    };

    int result = SendCancelOrderV2(ref cancelOrder);

    if (result == NLErrorCodes.NL_OK)
        Console.WriteLine($"✅ Cancel request sent for {clOrderId}");
    else
        Console.WriteLine($"❌ Cancel failed: {NLErrorCodes.GetErrorMessage(result)}");

    return result;
}
```

---

## 5. Critical Implementation Details

### 5.1 Garbage Collection Prevention

**CRITICAL:** Delegates MUST be stored as static fields to prevent GC.

```csharp
// ❌ WRONG - Will be garbage collected
public void Connect()
{
    DLLInitializeLogin(key, user, pass,
        (nType, nResult) => { /* handler */ },  // ← Will crash!
        null, null, null, null, null, null, null, null, null);
}

// ✅ CORRECT - Store as static field
private static TStateCallback _stateCallback = StateCallbackHandler;

private static void StateCallbackHandler(int nType, int nResult)
{
    // Safe implementation
}

public void Connect()
{
    DLLInitializeLogin(key, user, pass,
        _stateCallback,  // ← Safe!
        null, null, null, null, null, null, null, null, null);
}
```

### 5.2 String Marshaling

```csharp
// String parameters: LPWStr
[DllImport(DLL_PATH)]
public static extern int SomeFunction(
    [MarshalAs(UnmanagedType.LPWStr)] string param);

// String fields in structs: ByValTStr with SizeConst
[StructLayout(LayoutKind.Sequential)]
public struct MyStruct
{
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
    public string TextField;
}
```

### 5.3 Thread Safety

```csharp
// Callbacks run on DLL threads, not main thread
private static readonly object _lock = new object();
private static Queue<TradeData> _tradeQueue = new Queue<TradeData>();

private static void TradeCallback(/* ... */)
{
    lock (_lock)
    {
        _tradeQueue.Enqueue(tradeData);
    }
}

// Process on separate thread
private void ProcessQueue()
{
    while (true)
    {
        TradeData trade = null;
        lock (_lock)
        {
            if (_tradeQueue.Count > 0)
                trade = _tradeQueue.Dequeue();
        }

        if (trade != null)
        {
            // Heavy processing here (safe)
            ProcessTrade(trade);
        }

        Thread.Sleep(1);
    }
}
```

---

## 6. Troubleshooting

### 6.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `DllNotFoundException` | Wrong path or x86 build | Build as x64, verify DLL location |
| Callback crashes | GC collected delegate | Store delegates as static fields |
| Invalid login | Wrong credentials | Verify user/pass/key |
| No market data | Not subscribed | Subscribe after connection |
| `NL_INVALID_TICKER` | Wrong symbol format | Use "TICKER:EXCHANGE" format |

### 6.2 Debugging

```csharp
// Enable ProfitDLL logging
[DllImport(DLL_PATH)]
public static extern int SetLogLevel(int level);

// 0=None, 1=Error, 2=Warning, 3=Info, 4=Debug
SetLogLevel(4);

// Check DLL version
[DllImport(DLL_PATH)]
public static extern int GetDLLVersion(StringBuilder version, int size);

var version = new StringBuilder(256);
GetDLLVersion(version, 256);
Console.WriteLine($"ProfitDLL Version: {version}");
```

---

## 7. Best Practices

### 7.1 Connection Management

✅ **DO:**
- Wait for `bMarketConnected && bAtivo` before subscribing
- Implement reconnection logic (5s interval)
- Monitor connection health continuously
- Log all connection state changes

❌ **DON'T:**
- Subscribe before fully connected
- Block main thread in callbacks
- Ignore error codes
- Process heavy logic inside callbacks

### 7.2 Order Management

✅ **DO:**
- Validate orders before sending
- Track order lifecycle (PENDING → FILLED/CANCELED)
- Implement timeout handling
- Log all order actions with timestamps

❌ **DON'T:**
- Send orders without risk checks
- Assume orders are filled immediately
- Ignore partial fills
- Skip order confirmation callbacks

### 7.3 Performance

✅ **DO:**
- Use queues for async processing
- Batch WebSocket sends
- Implement backpressure handling
- Monitor memory usage

❌ **DON'T:**
- Do I/O operations in callbacks
- Create objects in hot paths
- Block callback threads
- Ignore memory leaks

---

## 8. Example: Complete Integration

```csharp
public class ProfitDllClient
{
    private static TStateCallback _stateCallback = OnStateChange;
    private static TConnectorTradeCallback _tradeCallback = OnTrade;
    private static bool _isConnected = false;

    public async Task<bool> ConnectAsync(
        string key, string user, string password)
    {
        var result = DLLInitializeLogin(
            key, user, password,
            _stateCallback, _tradeCallback,
            null, null, null, null, null, null, null, null);

        if (result != NLErrorCodes.NL_OK)
        {
            _logger.Error("Connection failed: {Error}",
                NLErrorCodes.GetErrorMessage(result));
            return false;
        }

        // Wait for connection (max 30s)
        var timeout = DateTime.Now.AddSeconds(30);
        while (!_isConnected && DateTime.Now < timeout)
        {
            await Task.Delay(100);
        }

        return _isConnected;
    }

    private static void OnStateChange(int nType, int nResult)
    {
        if (nType == 2 && nResult == 4) // Market connected
        {
            _isConnected = true;
            _logger.Information("Market connected successfully");
        }
    }

    private static void OnTrade(
        TConnectorAssetIdentifier assetId,
        IntPtr pTrade,
        uint flags)
    {
        // Queue for async processing
        _tradeQueue.Enqueue(new TradeData
        {
            Symbol = assetId.Ticker,
            /* ... */
        });
    }
}
```

---

## References

- [ProfitDLL Manual (PT-BR)](../profitdll/Manual - ProfitDLL pt_br.pdf)
- [Example C# Implementation](../../DOCS_PRFITDLL/Exemplo C#/)
- [Example Python Implementation](../../DOCS_PRFITDLL/Exemplo Python/)
- [Technical Specification](../architecture/technical-specification.md)
