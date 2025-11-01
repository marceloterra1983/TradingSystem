#!/usr/bin/env node
/**
 * Simple Workflow Runner for RAG Services
 *
 * Usage:
 *   node run-workflow.js <workflow-name>
 *
 * Examples:
 *   node run-workflow.js pre-commit
 *   node run-workflow.js full-validation
 *   node run-workflow.js health-check
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WorkflowRunner {
  constructor(workflowFile = 'workflow.json') {
    this.workflowFile = workflowFile;
    this.workflow = null;
    this.results = new Map();
    this.failed = new Set();
    this.completed = new Set();
  }

  async load() {
    const content = fs.readFileSync(this.workflowFile, 'utf-8');
    this.workflow = JSON.parse(content);
    console.log(`✓ Loaded workflow: ${this.workflow.name}`);
  }

  async run(workflowName) {
    if (!this.workflow.workflows[workflowName]) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    const targetWorkflow = this.workflow.workflows[workflowName];
    console.log(`\n🚀 Running workflow: ${workflowName}`);
    console.log(`📝 Description: ${targetWorkflow.description}\n`);

    const startTime = Date.now();

    try {
      await this.executeWorkflow(targetWorkflow);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ Workflow completed successfully in ${duration}s`);

      this.printSummary();
      return 0;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`\n❌ Workflow failed after ${duration}s`);
      console.error(`Error: ${error.message}`);

      this.printSummary();
      return 1;
    }
  }

  async executeWorkflow(workflow) {
    const tasks = workflow.tasks;
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const pending = new Set(tasks.map(t => t.id));

    while (pending.size > 0) {
      const runnable = this.getRunnableTasks(tasks, pending, taskMap);

      if (runnable.length === 0) {
        if (pending.size > 0) {
          throw new Error('Circular dependency or all tasks failed');
        }
        break;
      }

      // Execute runnable tasks
      for (const task of runnable) {
        await this.executeTask(task);
        pending.delete(task.id);
      }
    }
  }

  getRunnableTasks(tasks, pending, taskMap) {
    return tasks.filter(task => {
      if (!pending.has(task.id)) return false;
      if (this.failed.has(task.id)) return false;

      // Check dependencies
      if (task.depends_on && task.depends_on.length > 0) {
        return task.depends_on.every(dep => this.completed.has(dep));
      }

      return true;
    });
  }

  async executeTask(task) {
    console.log(`\n⏳ [${task.id}] ${task.name}`);

    const startTime = Date.now();

    try {
      let result;

      switch (task.type) {
        case 'shell':
          result = await this.executeShellTask(task);
          break;
        case 'parallel':
          result = await this.executeParallelTasks(task);
          break;
        case 'http':
          result = await this.executeHttpTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✓ [${task.id}] Completed in ${duration}s`);

      this.completed.add(task.id);
      this.results.set(task.id, { success: true, result, duration });

      return result;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`✗ [${task.id}] Failed after ${duration}s`);
      console.error(`  Error: ${error.message}`);

      this.failed.add(task.id);
      this.results.set(task.id, { success: false, error: error.message, duration });

      // Execute failure callbacks if defined
      if (task.on_failure) {
        console.log(`  Executing failure handlers...`);
        for (const failureTaskId of task.on_failure) {
          // Find and execute failure task
          console.log(`  - Running: ${failureTaskId}`);
        }
      }

      throw error;
    }
  }

  async executeShellTask(task) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', task.command], {
        stdio: task.interactive ? 'inherit' : 'pipe',
        env: { ...process.env, ...this.workflow.environment }
      });

      let stdout = '';
      let stderr = '';

      if (!task.interactive) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
          process.stdout.write(data);
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
          process.stderr.write(data);
        });
      }

      const timeout = task.timeout || 300000;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async executeParallelTasks(task) {
    console.log(`  Running ${task.tasks.length} tasks in parallel...`);

    const promises = task.tasks.map(async (subtask) => {
      try {
        const result = await this.executeShellTask({
          ...subtask,
          type: 'shell'
        });
        console.log(`  ✓ ${subtask.name || subtask.id}`);
        return { success: true, result };
      } catch (error) {
        console.error(`  ✗ ${subtask.name || subtask.id}: ${error.message}`);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);

    const failures = results.filter(r => !r.success);
    if (failures.length > 0 && task.wait_for === 'all') {
      throw new Error(`${failures.length} parallel task(s) failed`);
    }

    return results;
  }

  async executeHttpTask(task) {
    const axios = require('axios');

    const config = {
      method: task.method || 'GET',
      url: task.url,
      headers: task.headers || {},
      timeout: task.timeout || 30000
    };

    if (task.data) {
      config.data = task.data;
    }

    try {
      const response = await axios(config);
      return {
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      throw new Error(`HTTP ${task.method} ${task.url} failed: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('WORKFLOW SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n✅ Completed: ${this.completed.size}`);
    console.log(`❌ Failed: ${this.failed.size}`);

    if (this.failed.size > 0) {
      console.log('\nFailed tasks:');
      for (const taskId of this.failed) {
        const result = this.results.get(taskId);
        console.log(`  - ${taskId}: ${result.error}`);
      }
    }

    console.log('\nTask durations:');
    for (const [taskId, result] of this.results) {
      const status = result.success ? '✓' : '✗';
      console.log(`  ${status} ${taskId}: ${result.duration}s`);
    }
  }
}

// CLI Execution
async function main() {
  const workflowName = process.argv[2];

  if (!workflowName) {
    console.error('Usage: node run-workflow.js <workflow-name>');
    console.error('\nAvailable workflows:');

    try {
      const content = fs.readFileSync('workflow.json', 'utf-8');
      const config = JSON.parse(content);

      for (const [name, workflow] of Object.entries(config.workflows)) {
        console.error(`  - ${name}: ${workflow.description}`);
      }
    } catch (error) {
      console.error('  (Could not load workflow.json)');
    }

    process.exit(1);
  }

  const runner = new WorkflowRunner();

  try {
    await runner.load();
    const exitCode = await runner.run(workflowName);
    process.exit(exitCode);
  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = WorkflowRunner;
