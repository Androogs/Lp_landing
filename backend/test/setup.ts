import { setTestEnv } from "./env.js";
setTestEnv(process.env.TEST_DB_APP_URL || "postgres://lp_app:app@localhost:5433/lp_test?host=/tmp");
