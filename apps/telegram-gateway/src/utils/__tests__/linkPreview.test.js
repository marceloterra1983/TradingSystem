import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  extractTwitterLinks,
  extractYouTubeLinks,
  extractInstagramLinks,
  fetchTwitterPreview,
  fetchYouTubePreview,
  fetchInstagramPreview,
  extractLinkPreviews,
  isValidPreview
} from '../linkPreview.js';

// Mock axios
vi.mock('axios');

describe('Link Extraction', () => {
  describe('extractTwitterLinks', () => {
    it('should extract twitter.com links', () => {
      const text = 'Check this out! https://twitter.com/elonmusk/status/1234567890123456789';
      const links = extractTwitterLinks(text);
      
      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({
        url: 'https://twitter.com/elonmusk/status/1234567890123456789',
        username: 'elonmusk',
        tweetId: '1234567890123456789'
      });
    });

    it('should extract x.com links', () => {
      const text = 'New platform! https://x.com/naval/status/9876543210987654321';
      const links = extractTwitterLinks(text);
      
      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({
        url: 'https://x.com/naval/status/9876543210987654321',
        username: 'naval',
        tweetId: '9876543210987654321'
      });
    });

    it('should extract multiple Twitter links', () => {
      const text = `
        First: https://twitter.com/user1/status/111
        Second: https://x.com/user2/status/222
      `;
      const links = extractTwitterLinks(text);
      
      expect(links).toHaveLength(2);
      expect(links[0].username).toBe('user1');
      expect(links[1].username).toBe('user2');
    });

    it('should return empty array for text without links', () => {
      const text = 'Just a regular message without any links';
      const links = extractTwitterLinks(text);
      
      expect(links).toEqual([]);
    });

    it('should return empty array for null/undefined text', () => {
      expect(extractTwitterLinks(null)).toEqual([]);
      expect(extractTwitterLinks(undefined)).toEqual([]);
      expect(extractTwitterLinks('')).toEqual([]);
    });
  });

  describe('extractYouTubeLinks', () => {
    it('should extract youtube.com/watch links', () => {
      const text = 'Watch this! https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const links = extractYouTubeLinks(text);
      
      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoId: 'dQw4w9WgXcQ'
      });
    });

    it('should extract youtu.be links', () => {
      const text = 'Short link: https://youtu.be/dQw4w9WgXcQ';
      const links = extractYouTubeLinks(text);
      
      expect(links).toHaveLength(1);
      expect(links[0].videoId).toBe('dQw4w9WgXcQ');
    });

    it('should extract links with timestamps', () => {
      const text = 'At 1:30: https://youtube.com/watch?v=abc123defgh&t=90s';
      const links = extractYouTubeLinks(text);
      
      expect(links).toHaveLength(1);
      expect(links[0].videoId).toBe('abc123defgh');
    });

    it('should return empty array for non-YouTube links', () => {
      const text = 'https://twitter.com/user/status/123';
      const links = extractYouTubeLinks(text);
      
      expect(links).toEqual([]);
    });
  });

  describe('extractInstagramLinks', () => {
    it('should extract instagram.com/p/ links (posts)', () => {
      const text = 'Check out! https://www.instagram.com/p/ABC123xyz/';
      const links = extractInstagramLinks(text);
      
      expect(links).toHaveLength(1);
      expect(links[0].url).toMatch(/instagram\.com\/p\/ABC123xyz\/?/);
      expect(links[0].postId).toBe('ABC123xyz');
      expect(links[0].type).toBe('post');
    });

    it('should extract instagram.com/reel/ links (reels)', () => {
      const text = 'Cool reel! https://instagram.com/reel/XYZ789abc/';
      const links = extractInstagramLinks(text);
      
      expect(links).toHaveLength(1);
      expect(links[0].url).toMatch(/instagram\.com\/reel\/XYZ789abc\/?/);
      expect(links[0].postId).toBe('XYZ789abc');
      expect(links[0].type).toBe('reel');
    });

    it('should return empty array for non-Instagram links', () => {
      const text = 'https://facebook.com/post/123';
      const links = extractInstagramLinks(text);
      
      expect(links).toEqual([]);
    });
  });
});

describe('API Fetchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTwitterPreview', () => {
    it('should fetch and transform Twitter preview successfully', async () => {
      const mockResponse = {
        data: {
          tweet: {
            id: '123',
            text: 'Hello World!',
            author: {
              id: '456',
              name: 'Elon Musk',
              screen_name: 'elonmusk',
              avatar_url: 'https://avatar.url'
            },
            created_at: '2024-01-01T12:00:00.000Z',
            likes: 12345,
            retweets: 6789,
            replies: 4567,
            media: {
              photos: [{ url: 'https://photo.url' }]
            }
          }
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchTwitterPreview('elonmusk', '123');

      expect(result).toBeDefined();
      expect(result.type).toBe('twitter');
      expect(result.tweetId).toBe('123');
      expect(result.text).toBe('Hello World!');
      expect(result.author.username).toBe('elonmusk');
      expect(result.metrics.likes).toBe(12345);
      expect(result.media.type).toBe('photo');
    });

    it('should return null for 404 response', async () => {
      axios.get.mockRejectedValue({
        response: { status: 404 },
        message: 'Not found'
      });

      const result = await fetchTwitterPreview('user', '123');

      expect(result).toBeNull();
    });

    it('should return null for timeout', async () => {
      axios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'Timeout'
      });

      const result = await fetchTwitterPreview('user', '123');

      expect(result).toBeNull();
    });

    it('should return null for invalid response data', async () => {
      axios.get.mockResolvedValue({ data: null });

      const result = await fetchTwitterPreview('user', '123');

      expect(result).toBeNull();
    });
  });

  describe('fetchYouTubePreview', () => {
    it('should fetch and transform YouTube preview successfully', async () => {
      const mockResponse = {
        data: {
          title: 'Rick Astley - Never Gonna Give You Up',
          author_name: 'Rick Astley',
          author_url: 'https://youtube.com/@RickAstley',
          thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          thumbnail_width: 480,
          thumbnail_height: 360,
          html: '<iframe...></iframe>'
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchYouTubePreview('dQw4w9WgXcQ');

      expect(result).toBeDefined();
      expect(result.type).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.title).toBe('Rick Astley - Never Gonna Give You Up');
      expect(result.author.name).toBe('Rick Astley');
      expect(result.thumbnail.url).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    });

    it('should use fallback thumbnail if not provided', async () => {
      const mockResponse = {
        data: {
          title: 'Test Video',
          author_name: 'Test Author'
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchYouTubePreview('abc123defgh');

      expect(result.thumbnail.url).toBe('https://img.youtube.com/vi/abc123defgh/hqdefault.jpg');
    });

    it('should return null for private video (401)', async () => {
      axios.get.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await fetchYouTubePreview('privateVid');

      expect(result).toBeNull();
    });
  });

  describe('fetchInstagramPreview', () => {
    it('should create basic preview when no token configured', async () => {
      // No INSTAGRAM_ACCESS_TOKEN in env
      delete process.env.INSTAGRAM_ACCESS_TOKEN;

      const result = await fetchInstagramPreview(
        'https://instagram.com/p/ABC123/',
        'ABC123',
        'post'
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('instagram');
      expect(result.postId).toBe('ABC123');
      expect(result.postType).toBe('post');
      expect(result.basic).toBe(true);
      expect(result.thumbnail.url).toContain('ABC123');
    });

    it('should distinguish between posts and reels', async () => {
      const postResult = await fetchInstagramPreview('url', 'POST123', 'post');
      const reelResult = await fetchInstagramPreview('url', 'REEL456', 'reel');

      expect(postResult.postType).toBe('post');
      expect(postResult.title).toContain('Post');
      
      expect(reelResult.postType).toBe('reel');
      expect(reelResult.title).toContain('Reel');
    });

    it('should fetch rich preview when token is configured', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = 'test_token_123';

      const mockResponse = {
        data: {
          title: 'Instagram Post Title',
          author_name: 'test_user',
          author_url: 'https://instagram.com/test_user',
          thumbnail_url: 'https://thumbnail.url',
          thumbnail_width: 640,
          thumbnail_height: 640
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchInstagramPreview('url', 'POST123', 'post');

      expect(result.basic).toBeUndefined();
      expect(result.author.name).toBe('test_user');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('instagram_oembed'),
        expect.any(Object)
      );

      delete process.env.INSTAGRAM_ACCESS_TOKEN;
    });
  });
});

describe('extractLinkPreviews Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prioritize Twitter over YouTube and Instagram', async () => {
    const text = `
      Twitter: https://twitter.com/user/status/123
      YouTube: https://youtube.com/watch?v=abc123defgh
      Instagram: https://instagram.com/p/POST123/
    `;

    axios.get.mockResolvedValue({
      data: {
        tweet: {
          id: '123',
          text: 'Tweet text',
          author: { id: '1', name: 'User', screen_name: 'user', avatar_url: 'url' },
          created_at: '2024-01-01T00:00:00Z',
          likes: 0,
          retweets: 0,
          replies: 0
        }
      }
    });

    const result = await extractLinkPreviews(text);

    expect(result).toBeDefined();
    expect(result.type).toBe('twitter');
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('fxtwitter.com'),
      expect.any(Object)
    );
  });

  it('should fallback to YouTube if Twitter fetch fails', async () => {
    const text = `
      Twitter: https://twitter.com/user/status/123
      YouTube: https://youtube.com/watch?v=abc123defgh
    `;

    // Twitter fails
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });
    
    // YouTube succeeds
    axios.get.mockResolvedValueOnce({
      data: {
        title: 'Video Title',
        author_name: 'Author',
        author_url: 'url'
      }
    });

    const result = await extractLinkPreviews(text);

    expect(result).toBeDefined();
    expect(result.type).toBe('youtube');
  });

  it('should fallback to Instagram if Twitter and YouTube fail', async () => {
    const text = `
      Twitter: https://twitter.com/user/status/123
      YouTube: https://youtube.com/watch?v=abc123defgh
      Instagram: https://instagram.com/p/POST123/
    `;

    // Twitter fails
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });
    
    // YouTube fails
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });

    const result = await extractLinkPreviews(text);

    expect(result).toBeDefined();
    expect(result.type).toBe('instagram');
    expect(result.basic).toBe(true); // No token configured
  });

  it('should return null if no links found', async () => {
    const text = 'Just a regular message without any social media links';
    const result = await extractLinkPreviews(text);

    expect(result).toBeNull();
  });

  it('should return null if all API calls fail', async () => {
    const text = 'Twitter: https://twitter.com/user/status/123';

    axios.get.mockRejectedValue({ response: { status: 500 } });

    const result = await extractLinkPreviews(text);

    expect(result).toBeNull();
  });

  it('should process only the first link of each type', async () => {
    const text = `
      First tweet: https://twitter.com/user1/status/111
      Second tweet: https://twitter.com/user2/status/222
    `;

    axios.get.mockResolvedValue({
      data: {
        tweet: {
          id: '111',
          text: 'First tweet',
          author: { id: '1', name: 'User1', screen_name: 'user1', avatar_url: 'url' },
          created_at: '2024-01-01T00:00:00Z',
          likes: 0,
          retweets: 0,
          replies: 0
        }
      }
    });

    const result = await extractLinkPreviews(text);

    expect(result.tweetId).toBe('111'); // Only first link processed
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});

describe('isValidPreview', () => {
  it('should validate Twitter preview', () => {
    const validPreview = {
      type: 'twitter',
      url: 'https://twitter.com/user/status/123',
      tweetId: '123',
      author: { username: 'user' }
    };

    expect(isValidPreview(validPreview)).toBe(true);
  });

  it('should invalidate Twitter preview without tweetId', () => {
    const invalidPreview = {
      type: 'twitter',
      url: 'https://twitter.com/user/status/123',
      author: { username: 'user' }
      // Missing tweetId
    };

    expect(isValidPreview(invalidPreview)).toBe(false);
  });

  it('should validate YouTube preview', () => {
    const validPreview = {
      type: 'youtube',
      url: 'https://youtube.com/watch?v=abc123defgh',
      videoId: 'abc123defgh',
      title: 'Video Title'
    };

    expect(isValidPreview(validPreview)).toBe(true);
  });

  it('should invalidate YouTube preview without title', () => {
    const invalidPreview = {
      type: 'youtube',
      url: 'url',
      videoId: 'abc123defgh'
      // Missing title
    };

    expect(isValidPreview(invalidPreview)).toBe(false);
  });

  it('should validate Instagram preview', () => {
    const validPreview = {
      type: 'instagram',
      url: 'https://instagram.com/p/POST123/',
      postId: 'POST123'
    };

    expect(isValidPreview(validPreview)).toBe(true);
  });

  it('should invalidate null/undefined preview', () => {
    expect(isValidPreview(null)).toBe(false);
    expect(isValidPreview(undefined)).toBe(false);
    expect(isValidPreview({})).toBe(false);
  });

  it('should invalidate unknown preview type', () => {
    const unknownPreview = {
      type: 'tiktok',
      url: 'url',
      videoId: '123'
    };

    expect(isValidPreview(unknownPreview)).toBe(false);
  });
});

describe('Edge Cases', () => {
  it('should handle malformed URLs gracefully', () => {
    const text = 'Bad URL: https://twitter.com/user/';
    const links = extractTwitterLinks(text);
    
    expect(links).toEqual([]);
  });

  it('should handle very long text efficiently', () => {
    const longText = 'word '.repeat(10000) + 'https://twitter.com/user/status/123';
    const links = extractTwitterLinks(longText);
    
    expect(links).toHaveLength(1);
    expect(links[0].tweetId).toBe('123');
  });

  it('should handle text with special characters', () => {
    const text = 'Check this 👀: https://twitter.com/user/status/123 🔥';
    const links = extractTwitterLinks(text);
    
    expect(links).toHaveLength(1);
  });

  it('should reset regex between calls', () => {
    const text = 'https://twitter.com/user1/status/111';
    
    const firstCall = extractTwitterLinks(text);
    const secondCall = extractTwitterLinks(text);
    
    expect(firstCall).toEqual(secondCall);
  });
});

