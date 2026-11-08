const { tenantFilter, sanitizeTenantPayload } = require("../middleware/tenant");
const { fail } = require("./response");

/** Merge request tenant into a filter object. */
function withTenant(req, filter = {}) {
  return { ...tenantFilter(req), ...filter };
}

/** Ensure a document belongs to the current tenant. */
function assertSameTenant(req, doc, label = "Record") {
  if (!doc) return false;
  if (String(doc.tenantId) !== String(req.tenantId)) {
    return false;
  }
  return true;
}

async function findTenantDoc(Model, req, id) {
  const doc = await Model.findOne({ _id: id, tenantId: req.tenantId });
  return doc;
}

function denyCrossTenant(res) {
  return fail(res, "Record not found.", 404);
}

function tenantPayload(req, body = {}) {
  return {
    ...sanitizeTenantPayload(body),
    tenantId: req.tenantId,
  };
}

module.exports = {
  withTenant,
  assertSameTenant,
  findTenantDoc,
  denyCrossTenant,
  tenantPayload,
};
