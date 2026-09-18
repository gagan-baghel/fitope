import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.daily("prune stale rows", { hourUTC: 21, minuteUTC: 30 }, internal.maintenance.prune, {});
export default crons;
