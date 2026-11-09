const bcrypt = require("bcryptjs");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const User = require("../models/User");
const Permission = require("../models/Permission");
const { ensureRolesForTenant } = require("../seed/seed");
const { seedHierarchicalMenus } = require("../seed/resyncMenus");

const PLAN_LIMITS = {
  trial: { userLimit: 5, branchLimit: 1, days: 14 },
  starter: { userLimit: 10, branchLimit: 1, days: 0 },
  professional: { userLimit: 50, branchLimit: 5, days: 0 },
  enterprise: { userLimit: 200, branchLimit: 20, days: 0 },
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base) {
  let slug = slugify(base) || `pharmacy-${Date.now().toString(36)}`;
  let n = 0;
  while (await Company.exists({ slug: n ? `${slug}-${n}` : slug })) {
    n += 1;
  }
  return n ? `${slug}-${n}` : slug;
}

function buildSubscription(plan = "trial") {
  const key = PLAN_LIMITS[plan] ? plan : "trial";
  const limits = PLAN_LIMITS[key];
  const trialEndsAt =
    key === "trial" ? new Date(Date.now() + limits.days * 24 * 60 * 60 * 1000) : null;
  return {
    plan: key,
    status: key === "trial" ? "trialing" : "active",
    trialEndsAt,
    renewalDate: null,
    userLimit: limits.userLimit,
    branchLimit: limits.branchLimit,
    moduleLimits: {},
  };
}

/**
 * Provision a full tenant: company, main branch, roles, menus, owner user.
 */
async function provisionCompany({
  companyInput,
  ownerInput,
  plan = "trial",
  status = "active",
  approvedBy = null,
}) {
  const slug = await uniqueSlug(companyInput.slug || companyInput.name);
  const subscription = buildSubscription(plan);

  const company = await Company.create({
    name: companyInput.name,
    slug,
    legalName: companyInput.legalName || companyInput.name,
    registrationNumber: companyInput.registrationNumber || "",
    licenseNumber: companyInput.licenseNumber || "",
    phone: companyInput.phone || "",
    email: (companyInput.email || ownerInput.email || "").toLowerCase(),
    address: companyInput.address || "",
    city: companyInput.city || "",
    country: companyInput.country || "",
    website: companyInput.website || "",
    logo: companyInput.logo || "",
    status,
    branding: {
      pharmacyName: companyInput.name,
      logo: companyInput.logo || "",
      tagline: companyInput.tagline || "",
      primaryColor: companyInput.primaryColor || "#748CF8",
      secondaryColor: companyInput.secondaryColor || "#5A6FD8",
      sidebarActiveColor: companyInput.primaryColor || "#748CF8",
      buttonColor: companyInput.primaryColor || "#748CF8",
    },
    settings: {
      currency: companyInput.currency || "USD",
      language: companyInput.language || "en",
      timezone: companyInput.timezone || "UTC",
      dateFormat: companyInput.dateFormat || "YYYY-MM-DD",
      taxRate: Number(companyInput.taxRate || 0),
    },
    subscription,
    approvedAt: status === "active" ? new Date() : null,
    approvedBy: status === "active" ? approvedBy : null,
  });

  const branch = await Branch.create({
    tenantId: company._id,
    name: "Main Branch",
    code: "MAIN",
    phone: company.phone,
    address: company.address,
    isMain: true,
    isActive: true,
  });

  const allPerms = await Permission.find();
  const permMap = Object.fromEntries(allPerms.map((p) => [p.key, p._id]));
  await ensureRolesForTenant(company._id, allPerms, permMap);
  await seedHierarchicalMenus(company._id);

  const Role = require("../models/Role");
  const ownerRole =
    (await Role.findOne({ tenantId: company._id, name: "Company Owner" })) ||
    (await Role.findOne({ tenantId: company._id, name: "Super Admin" }));

  const existsUser = await User.findOne({
    tenantId: company._id,
    $or: [{ username: ownerInput.username }, { email: ownerInput.email.toLowerCase() }],
  });
  if (existsUser) {
    throw Object.assign(new Error("Owner username or email already exists in this company."), {
      statusCode: 409,
    });
  }

  const owner = await User.create({
    tenantId: company._id,
    username: ownerInput.username.trim(),
    email: ownerInput.email.toLowerCase().trim(),
    password: await bcrypt.hash(ownerInput.password, 10),
    fullName: ownerInput.fullName || ownerInput.username,
    phone: ownerInput.phone || "",
    roles: ownerRole ? [ownerRole._id] : [],
    branchIds: [branch._id],
    status: "active",
    isPlatformAdmin: false,
    isProtected: false,
  });

  company.ownerUserId = owner._id;
  await company.save();

  return { company, branch, owner };
}

module.exports = {
  PLAN_LIMITS,
  slugify,
  uniqueSlug,
  buildSubscription,
  provisionCompany,
};
