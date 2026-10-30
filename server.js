const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const publicDirectory = path.join(__dirname, "public");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const employees = [
  { id: "emp-1", name: "Olivia Rhye", email: "olivia@layer.com", role: "Product Designer", department: "Design", status: "Full-time", location: "London, UK", color: "violet", initials: "OR" },
  { id: "emp-2", name: "Phoenix Baker", email: "phoenix@layer.com", role: "Engineering Manager", department: "Engineering", status: "Full-time", location: "San Francisco, US", color: "orange", initials: "PB" },
  { id: "emp-3", name: "Lana Steiner", email: "lana@layer.com", role: "Frontend Developer", department: "Engineering", status: "Full-time", location: "Toronto, CA", color: "blue", initials: "LS" },
  { id: "emp-4", name: "Demi Wilkinson", email: "demi@layer.com", role: "Marketing Lead", department: "Marketing", status: "Part-time", location: "London, UK", color: "pink", initials: "DW" },
  { id: "emp-5", name: "Candice Wu", email: "candice@layer.com", role: "UX Researcher", department: "Design", status: "Full-time", location: "Melbourne, AU", color: "green", initials: "CW" },
  { id: "emp-6", name: "Natali Craig", email: "natali@layer.com", role: "People Partner", department: "People", status: "Full-time", location: "New York, US", color: "blue", initials: "NC" },
  { id: "emp-7", name: "Drew Cano", email: "drew@layer.com", role: "Product Manager", department: "Product", status: "Full-time", location: "Austin, US", color: "orange", initials: "DC" },
  { id: "emp-8", name: "Orlando Diggs", email: "orlando@layer.com", role: "Backend Developer", department: "Engineering", status: "Contract", location: "Berlin, DE", color: "violet", initials: "OD" },
];

const leaveRequests = [
  { id: "leave-1", name: "Sarah Chen", role: "Software Engineer", department: "Engineering", type: "Annual leave", dates: "Oct 21 – Oct 25", days: 5, initials: "SC", color: "pink" },
  { id: "leave-2", name: "Marcus Johnson", role: "Brand Designer", department: "Design", type: "Sick leave", dates: "Oct 18 – Oct 19", days: 2, initials: "MJ", color: "blue" },
  { id: "leave-3", name: "Ava Patel", role: "Account Executive", department: "Sales", type: "Annual leave", dates: "Oct 28 – Nov 1", days: 5, initials: "AP", color: "green" },
];

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bodySize = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      bodySize += chunk.length;
      if (bodySize > 10_000 && !tooLarge) {
        tooLarge = true;
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        return;
      }
      if (!tooLarge) body += chunk;
    });
    request.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 }));
      }
    });
    request.on("error", (error) => {
      if (!tooLarge) reject(error);
    });
  });
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getColor(name) {
  const colors = ["violet", "orange", "blue", "pink", "green"];
  return colors[name.length % colors.length];
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/employees" && request.method === "GET") {
    return sendJson(response, 200, employees);
  }

  if (url.pathname === "/api/employees" && request.method === "POST") {
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const department = typeof body.department === "string" ? body.department.trim() : "";

    if (!name || !email || !role || !department || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(response, 400, { error: "Enter a name, valid email, job title, and department." });
    }
    if (employees.some((employee) => employee.email.toLowerCase() === email)) {
      return sendJson(response, 409, { error: "An employee with this email already exists." });
    }

    const employee = {
      id: randomUUID(),
      name,
      email,
      role,
      department,
      status: "Full-time",
      location: "Remote",
      initials: getInitials(name),
      color: getColor(name),
    };
    employees.unshift(employee);
    return sendJson(response, 201, employee);
  }

  if (url.pathname === "/api/leaves" && request.method === "GET") {
    return sendJson(response, 200, leaveRequests);
  }

  const leaveMatch = url.pathname.match(/^\/api\/leaves\/([^/]+)$/);
  if (leaveMatch && request.method === "PATCH") {
    const leave = leaveRequests.find((requestItem) => requestItem.id === leaveMatch[1]);
    if (!leave) {
      return sendJson(response, 404, { error: "This leave request could not be found." });
    }

    const body = await readJson(request);
    if (body.status !== "approved" && body.status !== "declined") {
      return sendJson(response, 400, { error: "Choose approved or declined." });
    }

    leave.status = body.status;
    return sendJson(response, 200, leave);
  }

  if (url.pathname.startsWith("/api/")) {
    return sendJson(response, 404, { error: "API endpoint not found." });
  }

  return false;
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url, "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, url);
      if (handled !== false) return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      return response.end("Method not allowed.");
    }

    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400);
      return response.end("Invalid URL.");
    }

    const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(publicDirectory, requestedPath);
    if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) {
      response.writeHead(403);
      return response.end("Forbidden.");
    }

    let content;
    try {
      content = await fs.promises.readFile(filePath);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        response.writeHead(404);
        return response.end("Not found.");
      }
      throw error;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Content-Length": content.length,
    });
    return response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (response.headersSent) return response.destroy(error);
    const statusCode = error.statusCode || 500;
    if (statusCode === 500) console.error("Request failed:", error);
    return sendJson(response, statusCode, { error: statusCode === 500 ? "The server could not complete the request." : error.message });
  }
}

function createServer() {
  return http.createServer(handleRequest);
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`PeoplePulse is ready at http://localhost:${port}`);
  });
}


module.exports = { createServer };
