
const STORAGE_KEY = "taskflow_tasks";

const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("taskTitle");
const descriptionInput = document.getElementById("taskDescription");
const priorityInput = document.getElementById("taskPriority");
const dueDateInput = document.getElementById("taskDueDate");

const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");

const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEdit");
const formHeading = document.getElementById("formHeading");

let tasks = loadTasks();
let editingId = null;

document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (!savedTasks) return [];

    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.description === "string" &&
      ["To Do", "In Progress", "Completed"].includes(task.status) &&
      ["Low", "Medium", "High"].includes(task.priority)
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    alert("Could not save tasks. Check your browser storage.");
    console.error(error);
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function isValidDate(dateString) {
  if (!dateString) return true;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function updateStats() {
  document.getElementById("totalTasks").textContent = tasks.length;

  document.getElementById("pendingTasks").textContent =
    tasks.filter(task => task.status === "To Do").length;

  document.getElementById("progressTasks").textContent =
    tasks.filter(task => task.status === "In Progress").length;

  document.getElementById("completedTasks").textContent =
    tasks.filter(task => task.status === "Completed").length;
}

function formatDate(dateString) {
  if (!dateString) return "No due date";
  if (!isValidDate(dateString)) return "Invalid date";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function renderTasks() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedPriority = priorityFilter.value;

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm);

    const matchesStatus =
      selectedStatus === "All" || task.status === selectedStatus;

    const matchesPriority =
      selectedPriority === "All" || task.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <h3>No tasks found</h3>
        <p>Add a new task or change your search and filters.</p>
      </div>
    `;
    return;
  }

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  taskList.innerHTML = filteredTasks.map(task => {
    const safeId = escapeHTML(task.id);
    const safeTitle = escapeHTML(task.title);
    const safeDescription = escapeHTML(task.description);
    const safePriority = escapeHTML(task.priority);
    const safeStatus = escapeHTML(task.status);
    const safeDueDate = escapeHTML(formatDate(task.dueDate));

    const statusClass = task.status.replaceAll(" ", "-");
    const isOverdue =
      task.dueDate &&
      isValidDate(task.dueDate) &&
      task.dueDate < todayString &&
      task.status !== "Completed";

    return `
      <article class="task-card ${task.status === "Completed" ? "completed" : ""}">
        <div class="task-top">
          <div>
            <h3 class="task-title">${safeTitle}</h3>
            ${
              safeDescription
                ? `<p class="task-description">${safeDescription}</p>`
                : ""
            }
          </div>
        </div>

        <div class="task-meta">
          <span class="badge priority-${safePriority}">
            ${safePriority} Priority
          </span>

          <span class="badge status-${statusClass}">
            ${safeStatus}
          </span>

          <span class="due-date ${isOverdue ? "overdue" : ""}">
            ${isOverdue ? "Overdue: " : "Due: "}${safeDueDate}
          </span>
        </div>

        <div class="task-bottom">
          <select
            class="task-status"
            data-action="status"
            data-id="${safeId}"
            aria-label="Change status for ${safeTitle}"
          >
            <option value="To Do" ${task.status === "To Do" ? "selected" : ""}>To Do</option>
            <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Completed" ${task.status === "Completed" ? "selected" : ""}>Completed</option>
          </select>

          <div class="task-actions">
            <button class="action-btn" data-action="edit" data-id="${safeId}">Edit</button>
            <button class="action-btn delete" data-action="delete" data-id="${safeId}">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function resetForm() {
  taskForm.reset();
  editingId = null;
  formHeading.textContent = "Create a New Task";
  submitBtn.textContent = "+ Add Task";
  cancelEditBtn.hidden = true;
}

taskForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const priority = priorityInput.value;
  const dueDate = dueDateInput.value;

  if (!title) {
    alert("Please enter a task title.");
    titleInput.focus();
    return;
  }

  if (!isValidDate(dueDate)) {
    alert("Please select a valid due date using the calendar.");
    return;
  }

  if (!["Low", "Medium", "High"].includes(priority)) {
    alert("Please select a valid priority.");
    return;
  }

  if (editingId) {
    const task = tasks.find(item => item.id === editingId);

    if (!task) {
      resetForm();
      refreshDashboard();
      return;
    }

    task.title = title;
    task.description = description;
    task.priority = priority;
    task.dueDate = dueDate;
  } else {
    tasks.unshift({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      title,
      description,
      priority,
      dueDate,
      status: "To Do",
      createdAt: new Date().toISOString()
    });
  }

  if (!saveTasks()) {
    return;
  }

  resetForm();
  refreshDashboard();
});

taskList.addEventListener("click", function(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "edit") editTask(id);
  if (action === "delete") deleteTask(id);
});

taskList.addEventListener("change", function(event) {
  const select = event.target.closest('select[data-action="status"]');

  if (!select) return;

  const task = tasks.find(item => item.id === select.dataset.id);

  if (!task) return;

  const newStatus = select.value;

  if (!["To Do", "In Progress", "Completed"].includes(newStatus)) {
    return;
  }

  const previousStatus = task.status;
  task.status = newStatus;

  if (!saveTasks()) {
    task.status = previousStatus;
  }

  refreshDashboard();
});

function editTask(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  editingId = id;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  priorityInput.value = task.priority;
  dueDateInput.value = task.dueDate || "";

  formHeading.textContent = "Edit Task";
  submitBtn.textContent = "Save Changes";
  cancelEditBtn.hidden = false;

  document.getElementById("add-task").scrollIntoView({
    behavior: "smooth"
  });

  titleInput.focus();
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  if (!confirm(`Delete "${task.title}"?`)) return;

  const previousTasks = tasks;
  tasks = tasks.filter(item => item.id !== id);

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  if (editingId === id) {
    resetForm();
  }

  refreshDashboard();
}

function refreshDashboard() {
  updateStats();
  renderTasks();
}

searchInput.addEventListener("input", renderTasks);
statusFilter.addEventListener("change", renderTasks);
priorityFilter.addEventListener("change", renderTasks);
cancelEditBtn.addEventListener("click", resetForm);

refreshDashboard();
