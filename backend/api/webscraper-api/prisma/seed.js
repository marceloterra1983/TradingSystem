 
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTemplates() {
  const templates = [
    {
      name: 'GitHub Repository',
      description: 'Extract README and repository overview for GitHub projects.',
      urlPattern: '^https://github\\.com/[^/]+/[^/]+/?$',
      options: {
        formats: ['markdown', 'links'],
        onlyMainContent: true,
        includeTags: ['article', '#readme'],
        waitFor: 750
      }
    },
    {
      name: 'Documentation Site',
      description: 'Capture content from documentation portals and technical guides.',
      urlPattern: '.*/docs/.*',
      options: {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 1000,
        includeTags: ['main', 'article'],
        excludeTags: ['nav', 'footer']
      }
    },
    {
      name: 'News Article',
      description: 'Extract article body, metadata, and screenshots from news sites.',
      urlPattern: '.*/article/.*',
      options: {
        formats: ['markdown', 'screenshot'],
        onlyMainContent: true,
        includeTags: ['article'],
        excludeTags: ['aside', '.advertisement']
      }
    },
    {
      name: 'E-commerce Product',
      description: 'Pull product details and pricing information from e-commerce listings.',
      urlPattern: '.*/products?/.*',
      options: {
        formats: ['json', 'markdown'],
        onlyMainContent: false,
        includeTags: ['main', '.product'],
        waitFor: 1500
      }
    }
  ];

  console.info('⚙️  Seeding templates...');
  const templateRecords = [];
  for (const template of templates) {
    const record = await prisma.template.upsert({
      where: { name: template.name },
      update: {
        description: template.description,
        urlPattern: template.urlPattern,
        options: template.options
      },
      create: template
    });
    templateRecords.push(record);
  }
  return templateRecords;
}

function resolveTemplateId(templates, name) {
  return templates.find(template => template.name === name)?.id ?? null;
}

async function seedJobs(templates) {
  const now = new Date();
  const minutes = value => value * 60;

  const jobs = [
    {
      id: '2c4c0a64-5040-47cc-9032-2d08e7d5f450',
      type: 'scrape',
      url: 'https://github.com/trading-system/webscraper',
      status: 'completed',
      templateId: resolveTemplateId(templates, 'GitHub Repository'),
      options: {
        formats: ['markdown', 'links'],
        onlyMainContent: true
      },
      results: {
        markdown: '# TradingSystem WebScraper\n\nAutomated scraping pipeline documentation.',
        links: ['https://github.com/trading-system/webscraper#readme']
      },
      startedAt: new Date(now.getTime() - minutes(120) * 1000),
      completedAt: new Date(now.getTime() - minutes(118) * 1000),
      duration: 120,
      createdAt: new Date(now.getTime() - minutes(120) * 1000),
      updatedAt: new Date(now.getTime() - minutes(118) * 1000)
    },
    {
      id: '6f47e672-9c6d-4d58-8187-0150c12a8a08',
      type: 'scrape',
      url: 'https://docs.example.com/getting-started',
      status: 'failed',
      templateId: resolveTemplateId(templates, 'Documentation Site'),
      options: {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 1000
      },
      results: null,
      error: 'TimeoutError: Navigation timeout of 15000 ms exceeded',
      startedAt: new Date(now.getTime() - minutes(90) * 1000),
      completedAt: new Date(now.getTime() - minutes(90) * 1000),
      duration: 0,
      createdAt: new Date(now.getTime() - minutes(90) * 1000),
      updatedAt: new Date(now.getTime() - minutes(90) * 1000)
    },
    {
      id: '5a777f47-95ac-4d77-a3f9-7eebefb56382',
      type: 'crawl',
      url: 'https://news.example.com/ai',
      status: 'running',
      firecrawlJobId: 'crawl-job-1827',
      templateId: resolveTemplateId(templates, 'News Article'),
      options: {
        limit: 25,
        maxDepth: 2,
        scrapeOptions: {
          formats: ['markdown', 'screenshot'],
          onlyMainContent: true
        }
      },
      results: null,
      startedAt: new Date(now.getTime() - minutes(30) * 1000),
      createdAt: new Date(now.getTime() - minutes(30) * 1000),
      updatedAt: new Date(now.getTime() - minutes(10) * 1000)
    },
    {
      id: 'f5c6a2a5-6eb0-4f89-a0f6-b1b62a047f74',
      type: 'scrape',
      url: 'https://shop.example.com/products/limited-edition',
      status: 'completed',
      templateId: resolveTemplateId(templates, 'E-commerce Product'),
      options: {
        formats: ['json', 'markdown'],
        onlyMainContent: false
      },
      results: {
        json: {
          name: 'Limited Edition Sneakers',
          price: '$249.00',
          availability: 'In stock'
        }
      },
      startedAt: new Date(now.getTime() - minutes(45) * 1000),
      completedAt: new Date(now.getTime() - minutes(44) * 1000),
      duration: 60,
      createdAt: new Date(now.getTime() - minutes(45) * 1000),
      updatedAt: new Date(now.getTime() - minutes(44) * 1000)
    },
    {
      id: '01bb0719-f48f-4b44-8b12-93aaae3dbe32',
      type: 'crawl',
      url: 'https://docs.example.com',
      status: 'pending',
      templateId: resolveTemplateId(templates, 'Documentation Site'),
      options: {
        limit: 15,
        maxDepth: 3,
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: true
        }
      },
      results: null,
      startedAt: new Date(now.getTime() - minutes(15) * 1000),
      createdAt: new Date(now.getTime() - minutes(15) * 1000),
      updatedAt: new Date(now.getTime() - minutes(15) * 1000)
    }
  ];

  console.info('⚙️  Seeding scrape jobs...');
  for (const job of jobs) {
    const { id, startedAt, ...data } = job;
    const resolvedStartedAt = startedAt ?? new Date();
    await prisma.scrapeJob.upsert({
      where: {
        id_startedAt: {
          id,
          startedAt: resolvedStartedAt
        }
      },
      update: {
        ...data,
        startedAt: resolvedStartedAt,
        updatedAt: data.updatedAt ?? new Date()
      },
      create: {
        id,
        startedAt: resolvedStartedAt,
        ...data
      }
    });
  }
}

async function syncTemplateUsageCounts() {
  const aggregates = await prisma.scrapeJob.groupBy({
    by: ['templateId'],
    _count: {
      templateId: true
    },
    where: {
      templateId: {
        not: null
      }
    }
  });

  await prisma.template.updateMany({
    data: { usageCount: 0 }
  });

  await Promise.all(
    aggregates.map(({ templateId, _count }) =>
      prisma.template.update({
        where: { id: templateId },
        data: { usageCount: _count.templateId }
      })
    )
  );
}

async function main() {
  try {
    const templates = await seedTemplates();
    await seedJobs(templates);
    await syncTemplateUsageCounts();
    console.info('✅ Seed data successfully applied.');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
