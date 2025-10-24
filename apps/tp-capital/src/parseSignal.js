const DEFAULT_TYPE = 'Swing Trade';

const TARGET_REGEX = /ALVO\s*(\d+)\s*[:=-]\s*([0-9]+(?:[.,][0-9]+)?)/gi;

export function parseSignal(messageText, overrides = {}) {
  if (!messageText) {
    throw new Error('Empty message');
  }

  const normalized = messageText.replace(/\r/gi, '').trim();
  const uppercased = normalized.toUpperCase();
  const numericFriendly = uppercased
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(/(\d),(?=\d)/g, '$1.');

  const timestamp = overrides.timestamp || Date.now();
  const channel = overrides.channel || 'Desconhecido';
  const signalType = overrides.signalType || DEFAULT_TYPE;

  // Prioriza asset após "ATIVO:" ou código com números (ex: PETR4, KLBNK177)
  const assetAfterLabel = uppercased.match(/ATIV[OA]\s*[:=-]?\s*([A-Z]{3,}[0-9]+)/);
  const assetWithNumbers = uppercased.match(/([A-Z]{4,}[0-9]+)/);
  const assetFallback = uppercased.match(/([A-Z]{4,})/);
  const asset = overrides.asset || 
    (assetAfterLabel ? assetAfterLabel[1] : 
     assetWithNumbers ? assetWithNumbers[1] : 
     assetFallback ? assetFallback[1] : 'UNKNOWN');

  const buyRangeMatch = numericFriendly.match(
    /COMPRA(?:\s*\w+)?\s*(?:DE|MIN)?\s*[:=-]\s*([0-9]+(?:\.[0-9]+)?)(?:\s*(?:A|ATE|ATÉ|ATe|AT\u00C9|\u00E0|AT\u00E9|-|\u2013|AT\u0020|AT\u00C9)\s*([0-9]+(?:\.[0-9]+)?))?/
  );
  const buyMin = overrides.buyMin || (buyRangeMatch ? Number(buyRangeMatch[1]) : null);
  const buyMax =
    overrides.buyMax ||
    (buyRangeMatch ? Number(buyRangeMatch[2] || buyRangeMatch[1]) : null);

  const targets = {};
  TARGET_REGEX.lastIndex = 0;
  let targetMatch;
  while ((targetMatch = TARGET_REGEX.exec(numericFriendly)) !== null) {
    const index = Number(targetMatch[1]);
    targets[index] = Number(targetMatch[2]);
  }

  const targetFinalMatch = numericFriendly.match(/ALVO\s*(FINAL|GERAL)\s*[:=-]\s*([0-9]+(?:\.[0-9]+)?)/);
  const targetFinal = overrides.targetFinal || (targetFinalMatch ? Number(targetFinalMatch[2]) : targets[Object.keys(targets).length] || null);

  const stopMatch = numericFriendly.match(/STOP\s*[:=-]\s*([0-9]+(?:\.[0-9]+)?)/);

  const stop = overrides.stop || (stopMatch ? Number(stopMatch[1]) : null);

  return {
    ts: new Date(timestamp),
    timestamp,
    channel,
    signal_type: signalType,
    signalType,
    asset,
    buy_min: buyMin,
    buy_max: buyMax,
    buyMin,
    buyMax,
    target_1: overrides.target1 ?? targets[1] ?? null,
    target_2: overrides.target2 ?? targets[2] ?? null,
    target1: overrides.target1 ?? targets[1] ?? null,
    target2: overrides.target2 ?? targets[2] ?? null,
    target_final: targetFinal,
    targetFinal,
    stop,
    raw_message: normalized,
    rawMessage: normalized,
    source: overrides.source || 'forwarder',
    ingested_at: new Date()
  };
}
