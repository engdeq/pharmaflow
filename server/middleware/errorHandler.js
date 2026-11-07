const { fail } = require("../utils/response");

function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  return fail(res, err.message || "Internal server error.", status);
}

module.exports = errorHandler;
