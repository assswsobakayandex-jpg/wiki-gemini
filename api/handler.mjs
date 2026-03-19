export const config = {
  runtime: "nodejs@18.x"
};

import worker from "../src/worker.mjs";

export default worker.fetch;
