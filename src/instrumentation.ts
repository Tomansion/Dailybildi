export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on Node.js server, not Edge runtime
    const DailyBlockScheduler = (await import('@/lib/scheduler')).default
    DailyBlockScheduler.initialize()
  }
}
