\copy trading_signals (signal_id, source, symbol, direction, confidence, payload, created_at) FROM 'seed/trading_signals.csv' WITH (FORMAT csv, HEADER true);
\copy executions (order_id, symbol, side, price, quantity, status, created_at) FROM 'seed/executions.csv' WITH (FORMAT csv, HEADER true);
