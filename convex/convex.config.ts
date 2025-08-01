import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import r2 from "@convex-dev/r2/convex.config";

const app = defineApp();
app.use(agent);
app.use(r2);

export default app;