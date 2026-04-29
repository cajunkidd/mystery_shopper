import { buildApp } from "./app.js";
import { startScheduler } from "./jobs.js";
import { enforceEnv } from "./env.js";

enforceEnv();

const app = buildApp();

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Stine Mystery Shop API listening on :${port}`);
  startScheduler();
});
