import { $fetch } from "ofetch";

const fetchInstance = $fetch.create({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
  timeout: 10000,
  retry: 3,
});

export const myFetch = Object.assign(fetchInstance, {
  raw: async (url: string, options?: any) => {
    const response = await $fetch.raw(url, {
      ...options,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        ...options?.headers,
      },
      timeout: 10000,
      retry: 3,
    });

    // 确保 headers 对象有 getSetCookie 方法
    const headers = response.headers;
    if (headers) {
      // 如果已经有 getSetCookie 方法，直接返回
      if (typeof headers.getSetCookie === "function") {
        return response;
      }

      // 如果没有，手动实现 getSetCookie
      const setCookieValue =
        headers.get?.("set-cookie") ||
        headers.get?.("Set-Cookie") ||
        (headers as any)["set-cookie"] ||
        (headers as any)["Set-Cookie"];

      if (setCookieValue) {
        const cookies = Array.isArray(setCookieValue)
          ? setCookieValue
          : [setCookieValue];
        (headers as any).getSetCookie = () => cookies;
      } else {
        (headers as any).getSetCookie = () => [];
      }
    }

    return response;
  },
});
