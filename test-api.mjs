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
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Shared test APP ID
const TEST_APP_ID = "2037760725296357377";

async function loadConfig() {
  const configPath = join(process.cwd(), "runninghub-mcp-config.json");

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);
    return {
      apiKey: process.env.RUNNINGHUB_API_KEY || config.apiKey,
      baseUrl: config.baseUrl || "www.runninghub.ai",
      maxConcurrent: config.maxConcurrent || 1,
    };
  }

  if (process.env.RUNNINGHUB_API_KEY) {
    return {
      apiKey: process.env.RUNNINGHUB_API_KEY,
      baseUrl: "www.runninghub.ai",
      maxConcurrent: 1,
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
  } catch (error) {
    console.error("✗ Failed to load configuration:", error.message);
    process.exit(1);
  }

  const client = createClient(config);
  console.log("");

  // Test 1: Get APP Info
  console.log("Test 1: Get APP Info");
  console.log("-".repeat(40));

  try {
    const appInfo = await client.getAppInfo(TEST_APP_ID);

    if (appInfo.code === 0) {
      console.log("✓ APP Info retrieved successfully");
      console.log(`  - APP Name: ${appInfo.data?.webappName || "N/A"}`);
      console.log(
        `  - Parameters: ${appInfo.data?.nodeInfoList?.length || 0} nodes`,
      );

      if (appInfo.data?.nodeInfoList) {
        console.log("  - Node Info:");
        appInfo.data.nodeInfoList.slice(0, 5).forEach((node) => {
          console.log(`    - ${node.fieldName}: ${node.fieldType}`);
        });
        if (appInfo.data.nodeInfoList.length > 5) {
          console.log(
            `    ... and ${appInfo.data.nodeInfoList.length - 5} more`,
          );
        }
      }
    } else {
      console.log("✗ Failed to get APP info");
      console.log(`  - Error: ${appInfo.msg}`);
    }
  } catch (error) {
    console.error("✗ Exception:", error.message);
  }
  console.log("");

  // Test 2: Execute APP (Text to Image)
  console.log("Test 2: Execute APP (Text to Image)");
  console.log("-".repeat(40));
  console.log(
    "  Note: This test requires a valid APP with text-to-image capability",
  );
  console.log("  Using APP ID:", TEST_APP_ID);
  console.log("");

  try {
    const nodeInfoList = appInfo?.data?.nodeInfoList || [];

    // Find the prompt parameter
    const promptNode = nodeInfoList.find(
      (n) =>
        n.fieldName.toLowerCase().includes("prompt") ||
        n.nodeId.includes("prompt"),
    );

    if (!promptNode) {
      console.log("⚠ No prompt parameter found in APP config");
      console.log("  Skipping execute test");
    } else {
      console.log(
        '  Submitting task with prompt: "A beautiful sunset over mountains"',
      );

      const result = await client.submitTask(TEST_APP_ID, [
        {
          nodeId: promptNode.nodeId,
          fieldName: promptNode.fieldName,
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
        const maxWait = 5 * 60 * 1000; // 5 minutes
        const pollInterval = 5 * 1000; // 5 seconds

        while (Date.now() - startTime < maxWait) {
          const taskResult = await client.queryTask(taskId);

          if (taskResult.code === 0) {
            console.log("✓ Task completed successfully");
            console.log("  - Output:");
            if (taskResult.data) {
              taskResult.data.forEach((output, i) => {
                console.log(
                  `    [${i + 1}] ${output.fileUrl || JSON.stringify(output)}`,
                );
              });
            }

            // Save result
            const outputDir = join(process.cwd(), "output");
            if (!existsSync(outputDir)) {
              mkdirSync(outputDir, { recursive: true });
            }

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
            // Task still running or queued
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
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("Test Complete");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
