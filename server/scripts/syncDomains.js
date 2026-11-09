require("dotenv").config();
const { connectDB, disconnectDB } = require("../config/db");
const { backfillCompanyDomains } = require("../services/companyService");

async function main() {
  await connectDB();
  const rows = await backfillCompanyDomains();
  console.log(`Synced ${rows.length} domains:`);
  rows.forEach((r) => console.log(` - ${r.slug} → ${r.liveUrl}`));
  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
