import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFetch } from '~/server/utils/fetch';

// Mock the myFetch module
vi.mock('~/server/utils/fetch', () => ({
  myFetch: vi.fn(),
}));

describe('Data Sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Baidu Source', () => {
    it('should parse baidu hot list correctly', async () => {
      const { getBaiduHotList } = await import('~/server/sources/baidu');

      const mockHtml = `
        <html>
          <!--s-data:{"data":{"cards":[{"content":[{"word":"Test Title","rawUrl":"https://example.com/1"}]}]}}-->
        </html>
      `;

      vi.mocked(myFetch).mockResolvedValue(mockHtml);

      const result = await getBaiduHotList();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'https://example.com/1',
        title: 'Test Title',
        url: 'https://example.com/1',
      });
    });

    it('should filter out top items', async () => {
      const { getBaiduHotList } = await import('~/server/sources/baidu');

      const mockHtml = `
        <html>
          <!--s-data:{"data":{"cards":[{"content":[
            {"word":"Top Item","rawUrl":"https://example.com/top","isTop":true},
            {"word":"Normal Item","rawUrl":"https://example.com/normal"}
          ]}]}}-->
        </html>
      `;

      vi.mocked(myFetch).mockResolvedValue(mockHtml);

      const result = await getBaiduHotList();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Normal Item');
    });

    it('should throw error on invalid data', async () => {
      const { getBaiduHotList } = await import('~/server/sources/baidu');

      vi.mocked(myFetch).mockResolvedValue('<html>no data</html>');

      await expect(getBaiduHotList()).rejects.toThrow();
    });
  });

  describe('Common Source Patterns', () => {
    it('should handle network errors gracefully', async () => {
      const { getBaiduHotList } = await import('~/server/sources/baidu');

      vi.mocked(myFetch).mockRejectedValue(new Error('Network error'));

      await expect(getBaiduHotList()).rejects.toThrow('Network error');
    });
  });
});
