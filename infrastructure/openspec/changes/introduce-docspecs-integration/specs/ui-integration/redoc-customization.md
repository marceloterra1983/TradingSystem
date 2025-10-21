# Redoc Customization Specification

## ADDED Requirements

### REDOC.1: Theme Customization
The system must provide customized Redoc theming that matches TradingSystem's design system.

#### Scenario: Dark Mode Support
Given the user has dark mode enabled
When viewing the API documentation
Then Redoc should display in dark mode
And use TradingSystem's dark mode color palette

#### Scenario: Custom Styling
Given the API documentation is loaded
When viewing any endpoint
Then it should use custom TradingSystem fonts
And match TradingSystem's color scheme
And use consistent spacing patterns

### REDOC.2: Enhanced Navigation Features
The system must implement enhanced Redoc navigation features.

#### Scenario: Search Integration
Given a user is viewing the API documentation
When they use the search function
Then it should search across all API endpoints
And include WebSocket events
And highlight matching results

#### Scenario: Tag Organization
Given the API documentation
When viewing the sidebar
Then endpoints should be organized by domain tags
And include custom icons for each domain
And support tag filtering

### REDOC.3: Interactive Examples
The system must provide interactive API examples through Redoc.

#### Scenario: Try-It-Out Feature
Given a user is viewing an API endpoint
When they click "Try it out"
Then they should see an interactive request builder
And be able to execute test requests
And see formatted responses

### REDOC.4: Response Visualization
The system must enhance response visualization in Redoc.

#### Scenario: Market Data Responses
Given an endpoint returns market data
When viewing the example response
Then it should show formatted market data
And include mini-charts where applicable
And display properly formatted numbers

## Integration Example

```html
<!-- redoc.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>TradingSystem API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Inter:300,400,700|Roboto+Mono" rel="stylesheet">
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
    <style>
      body {
        margin: 0;
        padding: 0;
      }

      /* Custom Theme Variables */
      :root {
        --primary-color: #0066cc;
        --text-color: #2A2F45;
        --border-color: #E6E6E6;
        --code-background: #F5F7F9;
      }

      /* Dark Mode Overrides */
      @media (prefers-color-scheme: dark) {
        :root {
          --primary-color: #66B2FF;
          --text-color: #E6E6E6;
          --border-color: #404040;
          --code-background: #2A2F45;
        }
      }
    </style>
  </head>
  <body>
    <div id="redoc"></div>
    <script>
      Redoc.init('/spec/openapi.yaml', {
        theme: {
          typography: {
            fontFamily: 'Inter, sans-serif',
            headings: { fontFamily: 'Inter, sans-serif' },
            code: { fontFamily: 'Roboto Mono, monospace' }
          },
          sidebar: {
            backgroundColor: 'var(--code-background)',
            textColor: 'var(--text-color)'
          },
          colors: {
            primary: { main: 'var(--primary-color)' },
            text: { primary: 'var(--text-color)' },
            border: { dark: 'var(--border-color)' }
          }
        },
        expandResponses: '200,201',
        hideDownloadButton: false,
        nativeScrollbars: true,
        sortPropsAlphabetically: false,
        requiredPropsFirst: true,
        showExtensions: true,
        menuToggle: true,
        downloadDefinitionUrl: '/spec/openapi.yaml'
      });
    </script>
  </body>
</html>
```

## Custom Components

### Market Data Formatter
```typescript
// Custom response formatter for market data
const MarketDataFormatter = {
  name: 'market-data',
  props: ['data'],
  template: `
    <div class="market-data">
      <div class="price" :class="priceDirection">
        {{ formatPrice(data.price) }}
      </div>
      <mini-chart :data="data.history" />
    </div>
  `
};

// Register with Redoc
Redoc.registerComponent('market-data', MarketDataFormatter);
```