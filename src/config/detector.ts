/**
 * 自动检测 RunningHub 站点
 * 通过 API 调用验证账号归属
 */

const ENDPOINTS = [
  { url: "www.runninghub.cn", name: "国内站" },
  { url: "www.runninghub.ai", name: "国际站" },
];

const DEFAULT_TEST_APP_ID = "2037760725296357377";

interface DetectResult {
  url: string;
  name: string;
  success: boolean;
  latency: number;
}

/**
 * 自动检测账号注册站点
 * @param apiKey RunningHub API Key
 * @param testAppId 用于测试的 APP ID（可选）
 * @returns 检测到的站点 URL
 */
export async function detectBaseUrl(
  apiKey: string,
  testAppId?: string,
): Promise<string> {
  const appId = testAppId || DEFAULT_TEST_APP_ID;

  console.error("[RHMCP] 正在自动检测账号归属站点...");

  const results = await Promise.all(
    ENDPOINTS.map(async (endpoint): Promise<DetectResult> => {
      try {
        const startTime = Date.now();
        const response = await fetch(
          `https://${endpoint.url}/api/webapp/apiCallDemo?apiKey=${encodeURIComponent(apiKey)}&webappId=${appId}`,
          {
            method: "GET",
            signal: AbortSignal.timeout(5000),
          },
        );
        const latency = Date.now() - startTime;

        if (response.ok) {
          const data = (await response.json()) as { code?: number } | null;
          // code === 0 表示成功，code 4xx 表示 API Key 问题
          const success = data?.code === 0 || data?.code === 200;
          return { ...endpoint, success, latency };
        }
        return { ...endpoint, success: false, latency };
      } catch {
        return { ...endpoint, success: false, latency: Infinity };
      }
    }),
  );

  // 优先选择成功且延迟最低的
  const successful = results.filter((r) => r.success);
  if (successful.length > 0) {
    successful.sort((a, b) => a.latency - b.latency);
    const selected = successful[0];
    console.error(
      `[RHMCP] 检测到账号注册于: ${selected.name} (${selected.url})`,
    );
    return selected.url;
  }

  // 都失败，返回默认值
  console.error("[RHMCP] 自动检测失败，使用默认站点: www.runninghub.cn");
  console.error("[RHMCP] 如需手动指定，请在 service.json 中设置 baseUrl");
  return "www.runninghub.cn";
}

/**
 * 验证 baseUrl 是否有效
 */
export function isValidBaseUrl(url: string): boolean {
  return ENDPOINTS.some((e) => e.url === url) || url === "auto";
}

/**
 * 获取所有可用站点
 */
export function getAvailableEndpoints() {
  return ENDPOINTS.map((e) => ({ url: e.url, name: e.name }));
}
