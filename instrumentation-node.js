if (process.env.ENABLE_DATABASE_BOOTSTRAP === "true") {
  void (async () => {
    try {
      const { default: Database } = await import("./server/database/database.js");
      const database = Database.getInstance();

      console.debug("Connecting to database");
      await database.connect();
      console.debug("Connected");

      console.debug("Synchronizing models with database");
      await database.sync();
      console.debug("Synchronized");
    } catch (error) {
      const shouldFailFast = process.env.NODE_ENV === "production" && process.env.SKIP_DATABASE_BOOTSTRAP !== "true";

      console.warn("Database connection or initialization failed. Continuing without database bootstrap.");
      console.warn(error);

      if (shouldFailFast) {
        process.exit(1);
      }
    }
  })();
}
