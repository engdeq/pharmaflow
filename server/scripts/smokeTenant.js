/**
 * Quick smoke: login as company admin and platform admin; fetch menus.
 */
require("dotenv").config();

const API = process.env.SMOKE_API || "http://127.0.0.1:5000/api";

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  const adminLogin = await post("/auth/login", {
    username: "admin",
    password: "Admin@123",
  });
  console.log("admin login", adminLogin.status, adminLogin.data.message || adminLogin.data);
  if (!adminLogin.data.token) process.exit(1);

  const me = await get("/auth/me", adminLogin.data.token);
  console.log("admin me", {
    status: me.status,
    tenantId: me.data?.data?.tenantId,
    company: me.data?.data?.company?.name,
    isPlatformAdmin: me.data?.data?.isPlatformAdmin,
  });

  const menus = await get("/auth/my-menus", adminLogin.data.token);
  console.log("admin menus roots", (menus.data?.data || []).map((m) => m.label));

  const meds = await get("/medicines?limit=5", adminLogin.data.token);
  console.log("medicines", meds.status, meds.data?.success);

  const platformLogin = await post("/auth/login", {
    username: "platform",
    password: "Platform@123",
  });
  console.log("platform login", platformLogin.status, platformLogin.data.message || platformLogin.data);

  if (platformLogin.data.token) {
    const pme = await get("/auth/me", platformLogin.data.token);
    console.log("platform me", {
      status: pme.status,
      isPlatformAdmin: pme.data?.data?.isPlatformAdmin,
      company: pme.data?.data?.company,
    });
    const pmenus = await get("/auth/my-menus", platformLogin.data.token);
    console.log(
      "platform menus",
      (pmenus.data?.data || []).map((m) => m.label)
    );
  }

  console.log("SMOKE_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
