export const runtime = "nodejs";

import worker from "../src/worker.mjs";

export default worker.fetch;

export const config = { 
  regions: ["arn1"],
};
