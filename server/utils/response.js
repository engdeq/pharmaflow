function ok(res, data = null, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, message = "Request failed", status = 400, data = null) {
  return res.status(status).json({ success: false, message, data });
}

module.exports = { ok, fail };
