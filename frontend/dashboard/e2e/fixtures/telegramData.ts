/**
 * Test Data Fixtures for Telegram Gateway E2E Tests
 * Provides realistic test data for mocking and assertions
 */

export const mockChannels = [
  {
    id: '1',
    channelId: '-1001649127710',
    title: 'TP Capital',
    label: 'TP',
    active: true,
    totalMessages: 1234,
    lastMessageDate: new Date().toISOString(),
    createdAt: '2025-10-01T10:00:00.000Z'
  },
  {
    id: '2',
    channelId: '-1001744113331',
    title: 'Jonas Trading',
    label: 'jonas',
    active: true,
    totalMessages: 567,
    lastMessageDate: new Date().toISOString(),
    createdAt: '2025-10-15T12:00:00.000Z'
  },
  {
    id: '3',
    channelId: '-1001412188586',
    title: 'Ações',
    label: 'Ações',
    active: false,
    totalMessages: 89,
    lastMessageDate: '2025-11-03T15:00:00.000Z',
    createdAt: '2025-10-20T14:00:00.000Z'
  }
];

export const mockMessages = [
  {
    id: '1',
    messageId: 5306,
    channelId: '-1001649127710',
    channelTitle: 'TP Capital',
    text: 'COMPRA: PETR4 @ R$ 38.50 - Stop: R$ 37.80 - Alvo: R$ 40.00',
    date: new Date().toISOString(),
    sender: 'Admin',
    hasMedia: false,
    metadata: {
      views: 150,
      forwards: 5
    }
  },
  {
    id: '2',
    messageId: 5307,
    channelId: '-1001649127710',
    channelTitle: 'TP Capital',
    text: 'https://twitter.com/InformesDaBolsa/status/1985829751986987508',
    date: new Date(Date.now() - 3600000).toISOString(),
    sender: 'Bot',
    hasMedia: false,
    metadata: {
      linkPreview: {
        type: 'twitter',
        url: 'https://twitter.com/InformesDaBolsa/status/1985829751986987508',
        tweetId: '1985829751986987508',
        text: '#KEPL3 | KEPLER WEBER | Fato Relevante',
        author: {
          id: '1213307914741436416',
          name: 'Informes da Bolsa',
          username: 'InformesDaBolsa',
          profileImage: 'https://pbs.twimg.com/profile_images/1213308886322761728/ENUnxYr-_200x200.jpg'
        },
        metrics: {
          likes: 5,
          retweets: 2,
          replies: 1
        }
      }
    }
  },
  {
    id: '3',
    messageId: 5308,
    channelId: '-1001744113331',
    channelTitle: 'Jonas Trading',
    text: 'VENDA: VALE3 @ R$ 65.30 - Stop: R$ 66.00 - Alvo: R$ 63.50',
    date: new Date(Date.now() - 7200000).toISOString(),
    sender: 'Jonas',
    hasMedia: false,
    metadata: {}
  },
  {
    id: '4',
    messageId: 5309,
    channelId: '-1001649127710',
    channelTitle: 'TP Capital',
    text: 'Confira o vídeo de análise: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    date: new Date(Date.now() - 10800000).toISOString(),
    sender: 'Admin',
    hasMedia: false,
    metadata: {
      linkPreview: {
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoId: 'dQw4w9WgXcQ',
        title: 'Análise Técnica PETR4',
        author: {
          name: 'TP Capital',
          url: 'https://www.youtube.com/@tpcapital'
        },
        thumbnail: {
          url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          width: 480,
          height: 360
        }
      }
    }
  },
  {
    id: '5',
    messageId: 5310,
    channelId: '-1001649127710',
    channelTitle: 'TP Capital',
    text: 'Foto do gráfico anexada',
    date: new Date(Date.now() - 14400000).toISOString(),
    sender: 'Admin',
    hasMedia: true,
    photoUrl: 'https://example.com/chart.jpg',
    metadata: {}
  }
];

export const mockSyncResponse = {
  success: true,
  message: '50 mensagem(ns) sincronizada(s) de 3 canal(is). 45 salvas no banco.',
  data: {
    totalMessagesSynced: 50,
    totalMessagesSaved: 45,
    channelsSynced: [
      {
        channelId: '-1001649127710',
        label: 'TP',
        messagesSynced: 35
      },
      {
        channelId: '-1001744113331',
        label: 'jonas',
        messagesSynced: 10
      },
      {
        channelId: '-1001412188586',
        label: 'Ações',
        messagesSynced: 5
      }
    ],
    timestamp: new Date().toISOString()
  }
};

export const mockGatewayStatus = {
  success: true,
  data: {
    mtproto: {
      status: 'connected',
      uptime: 3600,
      lastSync: new Date().toISOString()
    },
    database: {
      status: 'connected',
      totalMessages: 6402,
      totalChannels: 7
    },
    cache: {
      status: 'connected',
      hitRate: 0.85
    }
  }
};

export const mockGatewayMetrics = {
  success: true,
  data: {
    messages: {
      total: 6402,
      last24h: 145,
      last7d: 812
    },
    channels: {
      total: 7,
      active: 7
    },
    sync: {
      lastSyncTime: new Date().toISOString(),
      averageSyncTime: 2.5,
      successRate: 0.99
    }
  }
};

export const mockChannelStats = {
  success: true,
  data: {
    channelId: '-1001649127710',
    title: 'TP Capital',
    statistics: {
      totalMessages: 1234,
      messagesLast24h: 45,
      messagesLast7d: 312,
      messagesLast30d: 1234,
      averagePerDay: 41,
      messagesWithMedia: 234,
      mediaPercentage: 18.96
    },
    topSenders: [
      { sender: 'Admin', count: 800 },
      { sender: 'Bot', count: 434 }
    ],
    messagesByDate: [
      { date: '2025-11-04', count: 45 },
      { date: '2025-11-03', count: 38 }
    ]
  }
};

export const mockGatewayLogs = [
  {
    level: 'info',
    timestamp: new Date().toISOString(),
    message: 'Gateway connected to Telegram',
    metadata: {}
  },
  {
    level: 'info',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    message: 'Message received from channel TP',
    metadata: { channelId: '-1001649127710' }
  },
  {
    level: 'warn',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    message: 'Rate limit approaching',
    metadata: { remaining: 50 }
  },
  {
    level: 'error',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    message: 'Failed to download photo',
    metadata: { messageId: 5305 }
  }
];

// Helper function to generate mock messages in bulk
export function generateMockMessages(count: number, channelId: string = '-1001649127710') {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    messageId: 5000 + i,
    channelId,
    channelTitle: 'TP Capital',
    text: `Test message ${i + 1}: PETR4 analysis`,
    date: new Date(Date.now() - i * 3600000).toISOString(),
    sender: i % 2 === 0 ? 'Admin' : 'Bot',
    hasMedia: i % 5 === 0,
    metadata: {}
  }));
}
