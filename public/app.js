const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const state = {
  cars: [],
  saved: new Set(JSON.parse(localStorage.getItem("savedCars") || "[]")),
  selectedCar: null
};

const carGrid = document.querySelector("#carGrid");
const filters = document.querySelector("#filters");
const quickSearch = document.querySelector("#quickSearch");
const resultCount = document.querySelector("#resultCount");
const maxPrice = document.querySelector("#maxPrice");
const maxPriceLabel = document.querySelector("#maxPriceLabel");
const drawer = document.querySelector("#leadDrawer");
const drawerTitle = document.querySelector("#drawerTitle");
const leadCarId = document.querySelector("#leadCarId");
const leadForm = document.querySelector("#leadForm");
const formStatus = document.querySelector("#formStatus");
const savedCount = document.querySelector("#savedCount");
const calculator = document.querySelector("#calculator");
const monthlyPayment = document.querySelector("#monthlyPayment");

function updateSavedCount() {
  savedCount.textContent = state.saved.size;
  localStorage.setItem("savedCars", JSON.stringify([...state.saved]));
}

function carCard(car) {
  const saved = state.saved.has(car.id);
  const tags = car.tags.map(tag => `<span class="tag">${tag}</span>`).join("");

  return `
    <article class="car-card">
      <div class="car-media">
        <img src="${car.image}" alt="${car.year} ${car.make} ${car.model}" loading="lazy">
        <button class="save-button" type="button" data-save="${car.id}" aria-label="Save ${car.make} ${car.model}">
          ${saved ? "♥" : "♡"}
        </button>
      </div>
      <div class="car-body">
        <div class="car-title">
          <h3>${car.year} ${car.make} ${car.model}</h3>
          <span class="price">${formatter.format(car.price)}</span>
        </div>
        <div class="car-meta">
          <span>${car.mileage.toLocaleString()} km</span>
          <span>${car.fuel}</span>
          <span>${car.transmission}</span>
          <span>${car.location}</span>
        </div>
        <div class="tag-row">${tags}</div>
        <div class="card-actions">
          <button class="primary-button" type="button" data-lead="${car.id}">Request details</button>
          <button class="outline-button" type="button" data-finance="${car.price}">Use in calculator</button>
        </div>
      </div>
    </article>
  `;
}

async function loadStats() {
  const response = await fetch("/api/stats");
  const stats = await response.json();
  document.querySelector("#totalCars").textContent = stats.totalCars;
  document.querySelector("#averagePrice").textContent = formatter.format(stats.averagePrice);
  document.querySelector("#locations").textContent = stats.locations;
}

async function loadCars(params = new URLSearchParams(new FormData(filters))) {
  const response = await fetch(`/api/cars?${params.toString()}`);
  const data = await response.json();
  state.cars = data.cars;
  resultCount.textContent = `${state.cars.length} matching cars`;
  carGrid.innerHTML = state.cars.length
    ? state.cars.map(carCard).join("")
    : `<div class="car-card"><div class="car-body"><h3>No cars found</h3><p>Try a different search or price range.</p></div></div>`;
}

function openLead(carId) {
  const car = state.cars.find(item => item.id === carId);
  if (!car) return;
  state.selectedCar = car;
  drawerTitle.textContent = `${car.year} ${car.make} ${car.model}`;
  leadCarId.value = car.id;
  formStatus.textContent = "";
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeLead() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function calculatePayment() {
  const form = new FormData(calculator);
  const price = Number(form.get("price"));
  const down = Number(form.get("down"));
  const annualRate = Number(form.get("rate"));
  const months = Number(form.get("months"));
  const principal = Math.max(price - down, 0);
  const monthlyRate = annualRate / 100 / 12;
  const payment = monthlyRate
    ? principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : principal / months;

  monthlyPayment.textContent = `${formatter.format(payment)} / month`;
}

filters.addEventListener("input", () => {
  maxPriceLabel.textContent = formatter.format(Number(maxPrice.value));
  loadCars();
});

quickSearch.addEventListener("submit", event => {
  event.preventDefault();
  const params = new URLSearchParams(new FormData(quickSearch));
  params.set("maxPrice", maxPrice.value);
  filters.search.value = params.get("search") || "";
  filters.body.value = params.get("body") || "all";
  filters.fuel.value = params.get("fuel") || "all";
  loadCars(params);
  document.querySelector("#inventory").scrollIntoView({ behavior: "smooth" });
});

carGrid.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save]");
  const leadButton = event.target.closest("[data-lead]");
  const financeButton = event.target.closest("[data-finance]");

  if (saveButton) {
    const id = Number(saveButton.dataset.save);
    if (state.saved.has(id)) {
      state.saved.delete(id);
    } else {
      state.saved.add(id);
    }
    updateSavedCount();
    loadCars();
  }

  if (leadButton) {
    openLead(Number(leadButton.dataset.lead));
  }

  if (financeButton) {
    calculator.price.value = financeButton.dataset.finance;
    calculatePayment();
    document.querySelector("#finance").scrollIntoView({ behavior: "smooth" });
  }
});

document.querySelector("#closeDrawer").addEventListener("click", closeLead);

drawer.addEventListener("click", event => {
  if (event.target === drawer) {
    closeLead();
  }
});

leadForm.addEventListener("submit", async event => {
  event.preventDefault();
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(leadForm)))
  });
  const data = await response.json();
  formStatus.textContent = data.message || data.error;
  if (response.ok) {
    leadForm.reset();
    if (state.selectedCar) {
      leadCarId.value = state.selectedCar.id;
    }
  }
});

calculator.addEventListener("input", calculatePayment);

document.querySelector("#openFavorites").addEventListener("click", () => {
  if (!state.saved.size) {
    resultCount.textContent = "No saved cars yet";
    document.querySelector("#inventory").scrollIntoView({ behavior: "smooth" });
    return;
  }

  const savedCars = state.cars.filter(car => state.saved.has(car.id));
  resultCount.textContent = `${savedCars.length} saved cars`;
  carGrid.innerHTML = savedCars.map(carCard).join("");
  document.querySelector("#inventory").scrollIntoView({ behavior: "smooth" });
});

updateSavedCount();
calculatePayment();
loadStats();
loadCars();
