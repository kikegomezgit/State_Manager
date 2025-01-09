const cron = require("node-cron");

class CronController {
  constructor() {
    this.job = null; // Reference to the current cron job
  }

  // Start the cron job with a specific interval and function
  start(interval, task) {
    if (this.job) {
      console.log("A cron job is already running. Stop it first.");
      return;
    }

    // Create the cron job
    this.job = cron.schedule(interval, async () => {
      console.log("Cron job executed. Running the task...");
      await task();

      // Stop and delete the cron job after execution
      this.stop();
    });

    console.log(`Cron job started with interval '${interval}'`);
  }

  // Stop the cron job and clear it
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null; // Clear the reference
      console.log("Cron job stopped and deleted.");
    } else {
      console.log("No cron job to stop.");
    }
  }
}

module.exports = CronController;
