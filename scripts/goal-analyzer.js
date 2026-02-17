#!/usr/bin/env node

/**
 * Goal Analyzer Sub-Agent
 * 
 * Analyzes goals and generates tasks via OpenClaw API
 * 
 * Usage:
 *   node goal-analyzer.js [goalId]  - Analyze specific goal or all active goals
 *   
 * Environment:
 *   OPENCLAW_GATEWAY_URL - Gateway API URL (default: http://localhost:3001)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const GOALS_API = process.env.GOALS_API || 'http://localhost:3001/api/goals';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3001';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj = new URL(url);
    const client = url.startsWith('https') ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function analyzeGoal(goal) {
  console.log(`\n🎯 Analyzing goal: "${goal.title}"`);
  
  // Prompt for sub-agent analysis
  const analysisPrompt = `
Analyze this goal and suggest specific, actionable tasks:

GOAL: ${goal.title}
DESCRIPTION: ${goal.description}
PRIORITY: ${goal.priority}
DUE DATE: ${goal.dueDate || 'Not set'}
METADATA: ${JSON.stringify(goal.metadata, null, 2)}

Please provide:
1. A brief analysis of the goal's feasibility and scope
2. 3-7 specific tasks needed to achieve this goal (each with title, description, estimated hours, priority)
3. Potential risks or blockers
4. Suggestions for success

Return ONLY valid JSON in this exact format:
{
  "analysis": "Your analysis here",
  "suggestedTasks": [
    {
      "title": "Task title",
      "description": "Description",
      "estimatedHours": 2,
      "priority": "high"
    }
  ],
  "risks": ["Risk 1", "Risk 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "confidence": 0.85
}
`;

  // Call sessions_spawn to run a sub-agent
  console.log('📊 Spawning sub-agent for analysis...');
  
  // For demo, we'll return a mock analysis
  // In production, this would call sessions_spawn via OpenClaw
  const mockAnalysis = {
    analysis: `This is a ${goal.priority} priority goal due ${goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'at an unspecified date'}. Breaking it down into actionable tasks will help track progress.`,
    suggestedTasks: [
      {
        title: `Plan ${goal.title}`,
        description: "Break down the goal into milestones and identify dependencies",
        estimatedHours: 2,
        priority: "high"
      },
      {
        title: `Research requirements`,
        description: "Identify tools, resources, and knowledge needed",
        estimatedHours: 3,
        priority: "high"
      },
      {
        title: `Setup and preparation`,
        description: "Prepare environment and gather resources",
        estimatedHours: 2,
        priority: "medium"
      },
      {
        title: `Implement solution`,
        description: "Execute the main work towards the goal",
        estimatedHours: 5,
        priority: "high"
      },
      {
        title: `Test and review`,
        description: "Validate results against success metrics",
        estimatedHours: 2,
        priority: "medium"
      },
      {
        title: `Document and handoff`,
        description: "Record learnings and document for future reference",
        estimatedHours: 1,
        priority: "low"
      }
    ],
    risks: [
      "Scope creep if not carefully managed",
      "Dependency on external factors"
    ],
    suggestions: [
      "Set clear success metrics at the start",
      "Schedule regular check-ins to track progress",
      "Identify and handle blockers early"
    ],
    confidence: 0.85
  };

  return mockAnalysis;
}

async function storeAnalysis(goalId, analysis) {
  console.log(`💾 Storing analysis for goal ${goalId}...`);
  
  try {
    const response = await postJSON(`${GOALS_API}/${goalId}/analysis`, analysis);
    
    if (response.status === 201) {
      console.log('✅ Analysis stored');
      return true;
    } else {
      console.error(`❌ Failed to store analysis: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error storing analysis: ${error.message}`);
    return false;
  }
}

async function createTasksFromAnalysis(goalId, suggestedTasks) {
  console.log(`📝 Creating ${suggestedTasks.length} tasks from analysis...`);
  
  try {
    const response = await postJSON(`${GOALS_API}/${goalId}/tasks/bulk`, {
      tasks: suggestedTasks
    });
    
    if (response.status === 201) {
      console.log(`✅ Created ${suggestedTasks.length} tasks`);
      return true;
    } else {
      console.error(`❌ Failed to create tasks: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating tasks: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🤖 Goal Analyzer Sub-Agent Started');
    console.log(`📡 API: ${GOALS_API}`);
    
    // Fetch active goals
    console.log('\n📋 Fetching active goals...');
    const goals = await fetchJSON(`${GOALS_API}?status=active`);
    
    if (!Array.isArray(goals) || goals.length === 0) {
      console.log('✨ No active goals to analyze');
      process.exit(0);
    }
    
    console.log(`Found ${goals.length} active goal(s)`);
    
    let analyzed = 0;
    let tasksCreated = 0;
    
    // Analyze each goal
    for (const goal of goals) {
      try {
        // Analyze goal
        const analysis = await analyzeGoal(goal);
        
        // Store analysis
        const analysisSaved = await storeAnalysis(goal.id, analysis);
        if (!analysisSaved) continue;
        
        // Create tasks from suggested tasks
        if (analysis.suggestedTasks && analysis.suggestedTasks.length > 0) {
          const tasksCreatedSuccess = await createTasksFromAnalysis(goal.id, analysis.suggestedTasks);
          if (tasksCreatedSuccess) {
            tasksCreated += analysis.suggestedTasks.length;
          }
        }
        
        analyzed++;
      } catch (error) {
        console.error(`❌ Error analyzing goal ${goal.id}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Analysis complete: ${analyzed} goals analyzed, ${tasksCreated} tasks created`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
