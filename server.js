const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const cars = [
  {
    id: 1,
    make: "Mercedes-Benz",
    model: "C-Class AMG Line",
    year: 2023,
    price: 43500,
    mileage: 12800,
    fuel: "Hybrid",
    transmission: "Automatic",
    body: "Sedan",
    location: "Douala",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=80",
    tags: ["Premium", "Low mileage", "Warranty"],
    rating: 4.9
  },
  {
    id: 2,
    make: "BMW",
    model: "X5 xDrive40i",
    year: 2022,
    price: 58900,
    mileage: 21400,
    fuel: "Petrol",
    transmission: "Automatic",
    body: "SUV",
    location: "Yaounde",
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=80",
    tags: ["Family SUV", "Panoramic roof", "Dealer inspected"],
    rating: 4.8
  },
  {
    id: 3,
    make: "Tesla",
    model: "Model 3 Long Range",
    year: 2024,
    price: 51200,
    mileage: 6200,
    fuel: "Electric",
    transmission: "Automatic",
    body: "Sedan",
    location: "Limbe",
    image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1400&q=80",
    tags: ["Electric", "Autopilot", "Fast charge"],
    rating: 4.9
  },
  {
    id: 4,
    make: "Toyota",
    model: "Land Cruiser Prado",
    year: 2021,
    price: 46800,
    mileage: 38600,
    fuel: "Diesel",
    transmission: "Automatic",
    body: "SUV",
    location: "Bafoussam",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=80",
    tags: ["4x4", "Reliable", "Road trip ready"],
    rating: 4.7
  },
  {
    id: 5,
    make: "Audi",
    model: "A5 Sportback",
    year: 2023,
    price: 39900,
    mileage: 15400,
    fuel: "Petrol",
    transmission: "Automatic",
    body: "Coupe",
    location: "Douala",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=80",
    tags: ["Sportback", "Leather", "Virtual cockpit"],
    rating: 4.8
  },
  {
    id: 6,
    make: "Range Rover",
    model: "Velar Dynamic",
    year: 2022,
    price: 64500,
    mileage: 18800,
    fuel: "Diesel",
    transmission: "Automatic",
    body: "SUV",
    location: "Kribi",
    image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1400&q=80",
    tags: ["Luxury SUV", "Air suspension", "Premium sound"],
    rating: 4.9
  }
];

const leads = [];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function filterCars(query) {
  const url = new URL(query, "http://localhost");
  const body = url.searchParams.get("body") || "all";
  const fuel = url.searchParams.get("fuel") || "all";
  const maxPrice = Number(url.searchParams.get("maxPrice") || 1000000);
  const search = (url.searchParams.get("search") || "").toLowerCase();

  return cars.filter(car => {
    const matchesBody = body === "all" || car.body === body;
    const matchesFuel = fuel === "all" || car.fuel === fuel;
    const matchesPrice = car.price <= maxPrice;
    const text = `${car.make} ${car.model} ${car.location}`.toLowerCase();
    return matchesBody && matchesFuel && matchesPrice && text.includes(search);
  });
}

function serveStatic(req, res) {
  const rawPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safePath = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url.startsWith("/api/cars")) {
    sendJson(res, 200, { cars: filterCars(req.url) });
    return;
  }

  if (req.method === "GET" && req.url === "/api/stats") {
    const averagePrice = Math.round(cars.reduce((sum, car) => sum + car.price, 0) / cars.length);
    sendJson(res, 200, {
      totalCars: cars.length,
      averagePrice,
      leads: leads.length,
      locations: [...new Set(cars.map(car => car.location))].length
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/leads") {
    try {
      const body = await parseBody(req);
      const lead = {
        id: leads.length + 1,
        name: String(body.name || "").trim(),
        phone: String(body.phone || "").trim(),
        carId: Number(body.carId),
        message: String(body.message || "").trim(),
        createdAt: new Date().toISOString()
      };

      if (!lead.name || !lead.phone || !lead.carId) {
        sendJson(res, 400, { error: "Name, phone, and car are required." });
        return;
      }

      leads.push(lead);
      sendJson(res, 201, { lead, message: "Request received. A sales advisor will contact you." });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request body." });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`DriveLux Motors running on port ${PORT}`);
});
