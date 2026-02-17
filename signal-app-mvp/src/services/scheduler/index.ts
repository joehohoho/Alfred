import cron from 'node-cron';
import { runSignalPipeline } from '@/services/pipeline/runPipeline';

const CRON_SCHEDULE = '0 */4 * * *'; // Every 4 hours

async function runJob() {
  console.log(`[scheduler] Running signal pipeline at ${new Date().toISOString()}`);
  try {
    await runSignalPipeline();
    console.log('[scheduler] Pipeline execution successful');
  } catch (error) {
    console.error('[scheduler] Pipeline execution failed', error);
  }
}

cron.schedule(CRON_SCHEDULE, runJob);

console.log(`Scheduler active with cron: ${CRON_SCHEDULE}`);
runJob();
