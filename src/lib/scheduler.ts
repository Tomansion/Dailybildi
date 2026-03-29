import cron from "node-cron";
import { BlockService } from "@/services/BlockService";

class DailyBlockScheduler {
  private static initialized = false;

  static initialize() {
    if (this.initialized) {
      console.log("⏰ Scheduler already initialized");
      return;
    }

    // Run at 00:00 UTC every day
    cron.schedule(
      "0 0 * * *",
      async () => {
        console.log("🎲 Running daily block selection...");

        try {
          const today = new Date().toISOString().split("T")[0];
          console.log(`📅 Selecting blocks for ${today}`);

          await BlockService.resetDailySelection(today);

          // This method handles both selection and saving
          const selectedBlocks = await BlockService.getTodaysDailyBlocks();

          console.log(
            `✅ Selected ${selectedBlocks.length} blocks for the day`,
          );
          console.log(`📦 Blocks: ${selectedBlocks.join(", ")}`);

          // Distribute blocks to all users
          await BlockService.distributeDailyBlocksToAllUsers();
          console.log("✅ Distributed daily blocks to all users");
        } catch (error) {
          console.error("❌ Daily block selection failed:", error);
        }
      },
      {
        timezone: "UTC",
      },
    );
    this.initialized = true;
  }
}

export default DailyBlockScheduler;
