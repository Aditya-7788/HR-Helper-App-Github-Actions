const employeeDialog = document.querySelector("#employee-dialog");
const employeeForm = document.querySelector("#employee-form");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
const leaveCount = document.querySelector("#leave-count");
const pendingCount = document.querySelector("#pending-count");

let employees = [];
let leaveRequests = [];
let toastTimer;

const pageContent = document.querySelector("#page-content");
const dashboardMarkup = pageContent.innerHTML;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function updateEmployeeCounts() {
  const teamCount = document.querySelector("#team-count");
  const peopleCount = document.querySelector("#people-count");
  const footerCount = document.querySelector("#table-footer-count");
  if (teamCount) teamCount.textContent = String(employees.length).padStart(2, "0");
  if (peopleCount) peopleCount.textContent = String(employees.length).padStart(2, "0");
  if (footerCount) footerCount.textContent = `Showing ${employees.length} employees`;
}

function employeeRowMarkup(employee) {
  const safeName = escapeHtml(employee.name);
  const safeEmail = escapeHtml(employee.email);
  const safeRole = escapeHtml(employee.role);
  const safeDepartment = escapeHtml(employee.department);
  const initials = escapeHtml(employee.initials);
  const color = ["violet", "orange", "blue", "pink", "green"].includes(employee.color) ? employee.color : "violet";
  const statusClass = employee.status === "Part-time" ? " status-dot-part-time" : "";
  return `<tr>
    <td><div class="employee-name-cell"><label class="checkbox-label" aria-label="Select ${safeName}"><input class="employee-checkbox" type="checkbox" /><span></span></label><span class="employee-avatar employee-avatar-${color}">${initials}</span><span class="employee-name-copy"><strong>${safeName}</strong><span>${safeEmail}</span></span></div></td>
    <td>${safeRole}</td>
    <td><span class="department-pill">${safeDepartment}</span></td>
    <td><span class="status-dot${statusClass}">${escapeHtml(employee.status)}</span></td>
    <td><button class="employee-more-button" type="button" aria-label="More options for ${safeName}" data-toast="More employee profile options are coming soon.">···</button></td>
  </tr>`;
}

function renderEmployees() {
  const tableBody = document.querySelector("#employee-table-body");
  if (!tableBody) return;
  const searchInput = document.querySelector("#employee-search");
  const departmentSelect = document.querySelector("#department-filter");
  const search = searchInput.value.trim().toLowerCase();
  const department = departmentSelect.value;
  const visibleEmployees = employees.filter((employee) => {
    const matchesSearch = `${employee.name} ${employee.email} ${employee.role} ${employee.department}`.toLowerCase().includes(search);
    return matchesSearch && (!department || employee.department === department);
  });

  tableBody.innerHTML = visibleEmployees.length
    ? visibleEmployees.map(employeeRowMarkup).join("")
    : '<tr><td class="empty-table-cell" colspan="5">No teammates match that search. Try a different name or team.</td></tr>';
  updateEmployeeCounts();
  const selectAll = document.querySelector("#select-all-employees");
  if (selectAll) selectAll.checked = false;
}

function renderPeoplePage() {
  const tableBody = pageContent.querySelector("#people-page-table-body");
  if (!tableBody) return;
  const search = pageContent.querySelector("#people-page-search").value.trim().toLowerCase();
  const department = pageContent.querySelector("#people-page-department").value;
  const visibleEmployees = employees.filter((employee) => (
    `${employee.name} ${employee.email} ${employee.role} ${employee.department}`.toLowerCase().includes(search)
    && (!department || employee.department === department)
  ));
  tableBody.innerHTML = visibleEmployees.length
    ? visibleEmployees.map(employeeRowMarkup).join("")
    : '<tr><td class="empty-table-cell" colspan="5">No teammates match that search. Try a different name or team.</td></tr>';
  pageContent.querySelector("#people-page-count").textContent = String(visibleEmployees.length);
  updateEmployeeCounts();
}

function renderLeaveRequests() {
  const dashboardList = document.querySelector("#dashboard-leave-list");
  const pendingRequests = leaveRequests.filter((request) => !request.status);
  if (pendingCount) pendingCount.textContent = String(pendingRequests.length).padStart(2, "0");
  if (leaveCount) leaveCount.textContent = String(pendingRequests.length).padStart(2, "0");
  if (dashboardList) dashboardList.innerHTML = leaveListMarkup(leaveRequests.slice(0, 3), true);
  const timeOffList = pageContent.querySelector("#timeoff-request-list");
  if (timeOffList) timeOffList.innerHTML = leaveListMarkup(leaveRequests, true);
  const timeOffCount = pageContent.querySelector("#timeoff-page-count");
  if (timeOffCount) timeOffCount.textContent = String(pendingRequests.length).padStart(2, "0");
}

function leaveListMarkup(requests, expanded = false) {
  const visibleRequests = requests.filter((request) => expanded || !request.status);
  if (!visibleRequests.length) {
    return '<div class="empty-leave">All caught up. No leave requests are waiting for review.</div>';
  }
  return visibleRequests.map((request) => {
    const status = request.status
      ? `<span class="leave-status leave-status-${request.status}">${escapeHtml(request.status)}</span>`
      : `<span class="leave-days">${request.days} days</span><button class="leave-action approve-action" type="button" aria-label="Approve ${escapeHtml(request.name)}’s leave" data-leave-action="approved" data-leave-id="${escapeHtml(request.id)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5"/></svg></button><button class="leave-action decline-action" type="button" aria-label="Decline ${escapeHtml(request.name)}’s leave" data-leave-action="declined" data-leave-id="${escapeHtml(request.id)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8"/></svg></button>`;
    const avatarColor = ["pink", "blue", "green"].includes(request.color) ? request.color : "blue";
    return `<div class="leave-request">
      <span class="leave-person-avatar leave-avatar-${avatarColor}">${escapeHtml(request.initials)}</span>
      <span class="leave-info"><strong class="leave-person-name">${escapeHtml(request.name)}</strong><span class="leave-request-detail">${escapeHtml(request.type)} <span>·</span> ${escapeHtml(request.dates)}</span></span>
      <span class="leave-actions">${status}</span>
    </div>`;
  }).join("");
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toastMessage.textContent = message;
  toast.classList.toggle("toast-error", isError);
  toast.querySelector(".toast-check").textContent = isError ? "!" : "✓";
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3300);
}

function setPage(page) {
  const breadcrumb = document.querySelector("#breadcrumb-page");
  breadcrumb.textContent = page;
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });
  document.querySelector("#sidebar").classList.remove("is-open");
  document.querySelector("#sidebar-scrim").classList.remove("is-visible");

  if (page === "Dashboard") {
    pageContent.innerHTML = dashboardMarkup;
    renderEmployees();
    renderPeoplePage();
    renderLeaveRequests();
    return;
  }

  const pageDetails = {
    "People": {
      eyebrow: "MEET THE WHOLE TEAM",
      title: "Every teammate, in one place.",
      description: "Find the right people, update your directory, and welcome someone new.",
      icon: "01",
      message: "Your people directory is already at your fingertips. Add someone new from your Dashboard.",
    },
    "Time off": {
      eyebrow: "ROOM TO REST AND RESET",
      title: "Time off, made easy.",
      description: "A clear view of upcoming leave and the requests that need a little attention.",
      icon: "02",
      message: "Leave requests are ready to review on your Dashboard. Approve or decline them right where they appear.",
    },
    "Payroll": {
      eyebrow: "PAYDAY, WITHOUT THE PAPERWORK",
      title: "Payroll is in good hands.",
      description: "Stay on top of pay runs, benefits, and the details that help everything add up.",
      icon: "03",
      message: "Everything is set for your next payday on October 25. Your payroll checklist is all caught up.",
    },
    "Reports": {
      eyebrow: "GOOD INSIGHTS, HEALTHY TEAMS",
      title: "A little clarity goes a long way.",
      description: "The people insights you need to make thoughtful, confident decisions.",
      icon: "04",
      message: "Your team's attendance has been 93.4% this year. That's a lot of people showing up for each other.",
    },
    "Inbox": {
      eyebrow: "THE LITTLE THINGS THAT ADD UP",
      title: "You're all caught up.",
      description: "Notes, reminders, and thoughtful little nudges from your workspace.",
      icon: "05",
      message: "Nothing waiting in your inbox. Go on, get yourself a cup of tea.",
    },
    "Settings": {
      eyebrow: "YOUR CORNER OF THE INTERNET",
      title: "Make it feel like yours.",
      description: "Keep your workspace and people operations just the way you like them.",
      icon: "06",
      message: "Workspace settings are all in order. Your team is in great hands.",
    },
  };
  const details = pageDetails[page];
  if (!details) return;

  let content = `<section class="subpage">
    <div class="eyebrow"><span class="live-dot"></span> ${details.eyebrow}</div>
    <h1>${details.title}</h1>
    <p class="subpage-description">${details.description}</p>
    <article class="subpage-card">
      <span class="subpage-icon">${details.icon}</span>
      <h2>${details.message}</h2>
      <button type="button" class="primary-button" data-page="Dashboard">Back to your dashboard <span>↗</span></button>
    </article>
    <footer class="page-footer"><span>Made for people, by people <span>✳</span></span><span>PeoplePulse <i>·</i> Your workspace, working smarter.</span></footer>
  </section>`;

  if (page === "People") {
    content = `<section class="subpage">
      <div class="eyebrow"><span class="live-dot"></span> MEET THE WHOLE TEAM</div>
      <div class="subpage-heading"><div><h1>Every teammate, in one place.</h1><p class="subpage-description">Find the right people, update your directory, and welcome someone new.</p></div><button class="primary-button" type="button" data-add-employee><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>Add employee</button></div>
      <article class="panel people-page-panel">
        <div class="employee-panel-heading"><div><h2>Your people <span class="heading-count heading-count-purple" id="people-page-count">08</span></h2><p>All the wonderful humans behind everything.</p></div><div class="employee-tools"><label class="search-box"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input id="people-page-search" type="search" placeholder="Find someone..." aria-label="Search employees" /></label><select class="filter-button people-page-filter" id="people-page-department" aria-label="Filter employees by department"><option value="">All teams</option><option>Design</option><option>Engineering</option><option>Marketing</option><option>People</option><option>Product</option><option>Sales</option></select></div></div>
        <div class="employee-table-wrap"><table class="employee-table"><thead><tr><th scope="col">NAME</th><th scope="col">JOB TITLE</th><th scope="col">DEPARTMENT</th><th scope="col">STATUS</th><th scope="col"></th></tr></thead><tbody id="people-page-table-body"></tbody></table></div>
      </article>
      <footer class="page-footer"><span>Made for people, by people <span>✳</span></span><span>PeoplePulse <i>·</i> Your workspace, working smarter.</span></footer>
    </section>`;
  } else if (page === "Time off") {
    content = `<section class="subpage">
      <div class="eyebrow"><span class="live-dot"></span> ROOM TO REST AND RESET</div>
      <h1>Time off, made easy.</h1><p class="subpage-description">A clear view of upcoming leave and the requests that need a little attention.</p>
      <article class="panel timeoff-page-panel"><div class="panel-heading"><div><h2>Leave requests <span class="heading-count" id="timeoff-page-count">03</span></h2><p>Review your team's requests in one place.</p></div><button class="primary-button" type="button" data-page="Dashboard">Back to dashboard <span>↗</span></button></div><div class="timeoff-request-list" id="timeoff-request-list"></div></article>
      <footer class="page-footer"><span>Made for people, by people <span>✳</span></span><span>PeoplePulse <i>·</i> Your workspace, working smarter.</span></footer>
    </section>`;
  }

  pageContent.innerHTML = content;
  if (page === "People") renderPeoplePage();
  if (page === "Time off") {
    renderLeaveRequests();
  }
}

async function handleEmployeeSubmit(event) {
  event.preventDefault();
  const submitButton = document.querySelector("#save-employee-button");
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Adding teammate…";
  try {
    const formData = new FormData(employeeForm);
    const employee = await requestJson("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    employees.unshift(employee);
    renderEmployees();
    renderPeoplePage();
    employeeDialog.close();
    employeeForm.reset();
    showToast(`${employee.name} is officially on the team. 🎉`);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Add to team";
  }
}

async function handleLeaveAction(button) {
  button.disabled = true;
  const { leaveAction: status, leaveId: id } = button.dataset;
  try {
    const updatedRequest = await requestJson(`/api/leaves/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    leaveRequests = leaveRequests.map((request) => request.id === id ? updatedRequest : request);
    renderLeaveRequests();
    showToast(`${updatedRequest.name}’s leave was ${status}.`);
  } catch (error) {
    button.disabled = false;
    showToast(error.message, true);
  }
}

function init() {
  const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  document.querySelector("#current-date").textContent = date;
  const hour = new Date().getHours();
  document.querySelector("#greeting").firstChild.textContent = `${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, Alex `;

  document.querySelector("#mobile-menu").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.add("is-open");
    document.querySelector("#sidebar-scrim").classList.add("is-visible");
  });
  document.querySelector("#sidebar-scrim").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.remove("is-open");
    document.querySelector("#sidebar-scrim").classList.remove("is-visible");
  });
  document.querySelectorAll(".sidebar [data-page]").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.page));
  });
  pageContent.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      setPage(pageButton.dataset.page);
      return;
    }
    if (event.target.closest("[data-add-employee]")) employeeDialog.showModal();
    const leaveButton = event.target.closest("[data-leave-action]");
    if (leaveButton) handleLeaveAction(leaveButton);
    const toastButton = event.target.closest("[data-toast]");
    if (toastButton) showToast(toastButton.dataset.toast);
  });
  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.toast));
  });
  document.querySelector("#notification-button").addEventListener("click", () => showToast("You're all caught up. Here's to a good day."));
  document.querySelector("#add-employee-button").addEventListener("click", () => employeeDialog.showModal());
  document.querySelector("#close-dialog").addEventListener("click", () => employeeDialog.close());
  document.querySelector("#cancel-dialog").addEventListener("click", () => employeeDialog.close());
  employeeForm.addEventListener("submit", handleEmployeeSubmit);
  pageContent.addEventListener("input", (event) => {
    if (event.target.matches("#employee-search")) renderEmployees();
    if (event.target.matches("#people-page-search")) renderPeoplePage();
  });
  pageContent.addEventListener("change", (event) => {
    if (event.target.matches("#department-filter")) renderEmployees();
    if (event.target.matches("#people-page-department")) renderPeoplePage();
    const selectAll = event.target.closest("#select-all-employees");
    if (selectAll) {
      document.querySelectorAll(".employee-checkbox").forEach((checkbox) => { checkbox.checked = selectAll.checked; });
    }
  });
  Promise.all([requestJson("/api/employees"), requestJson("/api/leaves")])
    .then(([employeeData, leaveData]) => {
      employees = employeeData;
      leaveRequests = leaveData;
      renderEmployees();
      renderLeaveRequests();
    })
    .catch((error) => {
      const tableBody = document.querySelector("#employee-table-body");
      const dashboardLeaveList = document.querySelector("#dashboard-leave-list");
      if (tableBody) tableBody.innerHTML = '<tr><td class="empty-table-cell" colspan="5">We couldn’t load your people. Please refresh to try again.</td></tr>';
      if (dashboardLeaveList) dashboardLeaveList.innerHTML = '<div class="empty-leave">We couldn’t load leave requests. Please refresh to try again.</div>';
      const timeOffList = pageContent.querySelector("#timeoff-request-list");
      if (timeOffList) timeOffList.innerHTML = '<div class="empty-leave">We couldn’t load leave requests. Please refresh to try again.</div>';
      const peoplePageBody = pageContent.querySelector("#people-page-table-body");
      if (peoplePageBody) peoplePageBody.innerHTML = '<tr><td class="empty-table-cell" colspan="5">We couldn’t load your people. Please refresh to try again.</td></tr>';
      showToast(error.message, true);
    });
}

init();
