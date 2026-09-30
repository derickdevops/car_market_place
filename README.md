# DriveLux Motors

DriveLux Motors is a dynamic car sales website built as a Docker teaching project.

It includes:

- A beautiful responsive car marketplace UI
- Dynamic inventory loaded from `/api/cars`
- Search, body type, fuel type, and price filters
- Saved cars using browser local storage
- Finance calculator
- Lead request form saved in server memory
- Dockerfile deployment

## Build The Docker Image

```bash
docker build -t drivelux-car-marketplace:v1.0.0 .
```

## Run With Docker

```bash
docker run -d --name drivelux-car-marketplace -p 8080:3000 drivelux-car-marketplace:v1.0.0
```

Open:

```text
http://localhost:8080
```

## Stop

```bash
docker stop drivelux-car-marketplace
docker rm drivelux-car-marketplace
```

## Run Without Docker

```bash
node server.js
```

Open:

```text
http://localhost:3000
```

## Project Structure

```text
.
├── Dockerfile
├── package.json
├── server.js
└── public
    ├── app.js
    ├── index.html
    └── styles.css
```
