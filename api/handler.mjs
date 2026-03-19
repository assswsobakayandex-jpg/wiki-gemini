export const config = {
  runtime: "nodejs"
};

import worker from "../src/worker.mjs";

export default worker.fetch;
