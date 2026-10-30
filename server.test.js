const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer } = require("./server");

const server = createServer();
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("serves the HR dashboard and its assets", async () => {
  const pageResponse = await fetch(baseUrl);
  assert.equal(pageResponse.status, 200);
  assert.match(pageResponse.headers.get("content-type"), /text\/html/);
  assert.match(await pageResponse.text(), /PeoplePulse/);

  const scriptResponse = await fetch(`${baseUrl}/app.js`);
  assert.equal(scriptResponse.status, 200);
  assert.match(scriptResponse.headers.get("content-type"), /javascript/);
});

test("lists employees and validates new employee requests", async () => {
  const listResponse = await fetch(`${baseUrl}/api/employees`);
  const originalEmployees = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(originalEmployees.length, 8);

  const email = `teammate-${Date.now()}@example.com`;
  const employee = { name: "Jamie Park", email, role: "People Partner", department: "People" };
  const createdResponse = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(employee),
  });
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 201);
  assert.equal(created.name, employee.name);
  assert.equal(created.initials, "JP");

  const duplicateResponse = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(employee),
  });
  assert.equal(duplicateResponse.status, 409);

  const invalidResponse = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...employee, email: "not-an-email" }),
  });
  assert.equal(invalidResponse.status, 400);

  const oversizedResponse = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "J".repeat(11_000) }),
  });
  assert.equal(oversizedResponse.status, 413);
});

test("approves and declines leave requests", async () => {
  const listResponse = await fetch(`${baseUrl}/api/leaves`);
  const requests = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(requests.length, 3);

  const response = await fetch(`${baseUrl}/api/leaves/leave-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "approved");

  const invalidResponse = await fetch(`${baseUrl}/api/leaves/leave-2`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "pending" }),
  });
  assert.equal(invalidResponse.status, 400);

  const missingResponse = await fetch(`${baseUrl}/api/leaves/not-found`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "declined" }),
  });
  assert.equal(missingResponse.status, 404);
});

test("returns explicit errors for unknown endpoints and unsupported methods", async () => {
  const apiResponse = await fetch(`${baseUrl}/api/not-found`);
  assert.equal(apiResponse.status, 404);

  const methodResponse = await fetch(`${baseUrl}/styles.css`, { method: "POST" });
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get("allow"), "GET, HEAD");
});
