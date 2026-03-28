#!/usr/bin/env node
/**
 * RunningHub MCP Integration Test
 *
 * This script tests the actual API calls to RunningHub.
 *
 * Prerequisites:
 * 1. Set RUNNINGHUB_API_KEY environment variable
 * 2. Or create runninghub-mcp-config.json with apiKey
 *
 * Usage:
 *   node test-api.js
 *
 * Or with environment variable:
 *   RUNNINGHUB_API_KEY=your_key node test-api.js
 */

import { createClient } from "./dist/api/client.js";
import { processOutput, ensureOutputDir } from "./dist/utils/storage.js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Shared test APP ID
const TEST_APP_ID = "2037760725296357377";

function loadConfig() {
  const configPath = join(process.cwd(), "runninghub-mcp-config.json");

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);
    const apiKey = process.env.RUNNINGHUB_API_KEY || config.apiKey;
    if (!apiKey) {
      throw new Error("No API key found in config or environment");
    }
    return {
      apiKey,
      baseUrl: config.baseUrl || "www.runninghub.cn",
      maxConcurrent: config.maxConcurrent || 1,
      storage: config.storage || { mode: "local", path: "./output" },
      apps: config.apps || {},
      modelRules: config.modelRules || { rules: {}, defaultLanguage: "zh" },
      retry: config.retry || { maxRetries: 3, maxWaitTime: 600, interval: 5 },
      logging: config.logging || { level: "info" },
    };
  }

  if (process.env.RUNNINGHUB_API_KEY) {
    return {
      apiKey: process.env.RUNNINGHUB_API_KEY,
      baseUrl: "www.runninghub.cn",
      maxConcurrent: 1,
      storage: { mode: "local", path: "./output" },
      apps: {},
      modelRules: { rules: {}, defaultLanguage: "zh" },
      retry: { maxRetries: 3, maxWaitTime: 600, interval: 5 },
      logging: { level: "info" },
    };
  }

  throw new Error(
    "No API key found. Set RUNNINGHUB_API_KEY or create runninghub-mcp-config.json",
  );
}

async function main() {
  console.log("=".repeat(60));
  console.log("RunningHub MCP Integration Test");
  console.log("=".repeat(60));
  console.log("");

  // Load config
  let config;
  try {
    config = loadConfig();
    console.log("✓ Configuration loaded");
    console.log(
      `  - API Key: ${config.apiKey.substring(0, 4)}***${config.apiKey.slice(-4)}`,
    );
    console.log(`  - Base URL: ${config.baseUrl}`);
    console.log(`  - Storage Mode: ${config.storage?.mode || "local"}`);
    console.log(`  - Output Path: ${config.storage?.path || "./output"}`);
  } catch (error) {
    console.error("✗ Failed to load configuration:", error.message);
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = config.storage?.path || "./output";
  ensureOutputDir(outputDir);
  console.log(`  - Output directory: ${outputDir}`);
  console.log("");

  const client = createClient(config);

  // Test 1: Get APP Info
  console.log("Test 1: Get APP Info");
  console.log("-".repeat(40));

  let appInfoResult;
  try {
    appInfoResult = await client.getAppInfo(TEST_APP_ID);

    if (appInfoResult.code === 0) {
      console.log("✓ APP Info retrieved successfully");
      console.log(`  - APP Name: ${appInfoResult.data?.webappName || "N/A"}`);
      console.log(
        `  - Parameters: ${appInfoResult.data?.nodeInfoList?.length || 0} nodes`,
      );

      if (appInfoResult.data?.nodeInfoList) {
        console.log("  - Node Info:");
        appInfoResult.data.nodeInfoList.slice(0, 5).forEach((node) => {
          console.log(`    - ${node.fieldName}: ${node.fieldType}`);
        });
      }
    } else {
      console.log("✗ Failed to get APP info");
      console.log(`  - Error: ${appInfoResult.msg}`);
    }
  } catch (error) {
    console.error("✗ Exception:", error.message);
  }
  console.log("");

  // Test 2: Execute APP (Text to Image)
  console.log("Test 2: Execute APP (Text to Image)");
  console.log("-".repeat(40));
  console.log("  Using APP ID:", TEST_APP_ID);
  console.log("");

  try {
    const nodeInfoList = appInfoResult?.data?.nodeInfoList || [];
    const promptNode = nodeInfoList.find(
      (n) => n.fieldType === "STRING" || n.fieldName === "text",
    );

    if (!promptNode) {
      console.log("⚠ No prompt parameter found in APP config");
      console.log(
        "  Available nodes:",
        nodeInfoList.map((n) => `${n.fieldName}(${n.fieldType})`).join(", "),
      );
    } else {
      console.log(
        `  Found prompt node: ${promptNode.fieldName} (${promptNode.fieldType})`,
      );
      console.log(
        '  Submitting task with prompt: "A beautiful sunset over mountains"',
      );

      const result = await client.submitTask(TEST_APP_ID, [
        {
          nodeId: promptNode.nodeId,
          nodeName: promptNode.nodeName,
          fieldName: promptNode.fieldName,
          fieldType: promptNode.fieldType,
          fieldValue: "A beautiful sunset over mountains, photorealistic, 4k",
        },
      ]);

      if (result.code === 0) {
        const taskId = result.data?.taskId;
        console.log("✓ Task submitted successfully");
        console.log(`  - Task ID: ${taskId}`);

        // Poll for result
        console.log("");
        console.log("  Waiting for result (max 5 minutes)...");

        const startTime = Date.now();
        const maxWait = 5 * 60 * 1000;
        const pollInterval = 5 * 1000;

        while (Date.now() - startTime < maxWait) {
          const taskResult = await client.queryTask(taskId);

          if (taskResult.code === 0 && taskResult.data) {
            console.log("✓ Task completed successfully");
            console.log("  - Outputs:");

            // Process each output based on storage mode
            for (let i = 0; i < taskResult.data.length; i++) {
              const output = taskResult.data[i];
              console.log(
                `    [${i + 1}] Original URL: ${output.fileUrl || "N/A"}`,
              );

              if (output.fileUrl) {
                // Test storage processing
                console.log(
                  `        Processing with storage mode: ${config.storage?.mode || "local"}`,
                );
                const processed = await processOutput(
                  output.fileUrl,
                  `${taskId}_${i + 1}`,
                  config.storage,
                  taskId,
                );

                if (processed.localPath) {
                  console.log(
                    `        ✓ Downloaded to: ${processed.localPath}`,
                  );
                }
                if (processed.originalUrl) {
                  console.log(`        Original URL: ${processed.originalUrl}`);
                }
              }
            }

            // Save result
            const resultPath = join(
              outputDir,
              `test-result-${Date.now()}.json`,
            );
            writeFileSync(
              resultPath,
              JSON.stringify(
                {
                  taskId,
                  status: "SUCCESS",
                  outputs: taskResult.data,
                  executedAt: new Date().toISOString(),
                },
                null,
                2,
              ),
            );
            console.log(`  - Result saved to: ${resultPath}`);
            break;
          } else if (taskResult.code === 804 || taskResult.code === 813) {
            process.stdout.write(
              `\r  - Status: ${taskResult.code === 804 ? "RUNNING" : "QUEUED"}... `,
            );
            await new Promise((r) => setTimeout(r, pollInterval));
          } else if (taskResult.code === 805) {
            console.log("✗ Task failed");
            console.log("  - Error:", JSON.stringify(taskResult.data));
            break;
          } else {
            console.log(`✗ Unexpected status code: ${taskResult.code}`);
            console.log("  - Message:", taskResult.msg);
            break;
          }
        }

        if (Date.now() - startTime >= maxWait) {
          console.log("⚠ Task timed out after 5 minutes");
        }
      } else {
        console.log("✗ Failed to submit task");
        console.log(`  - Error: ${result.msg}`);
      }
    }
  } catch (error) {
    console.error("✗ Exception:", error.message);
    console.error(error.stack);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("Test Complete");
  console.log("=".repeat(60));
  console.log("");
  console.log("Storage mode used:", config.storage?.mode || "local");
  console.log("Output directory:", outputDir);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
