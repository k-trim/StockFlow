# StockSync

StockSync is a full-stack inventory management application built using React, Java, Spring Boot, and PostgreSQL. It allows users to manage products, track stock quantities, and view inventory updates in real time.

## Tech Stack

- **Frontend:** React.js, Vite
- **Backend:** Java, Spring Boot
- **Database:** PostgreSQL
- **Database Access:** Spring Data JPA
- **Real-Time Communication:** WebSockets (STOMP)
- **Other Tools:** Maven, Flyway, Swagger

## Features

- Add new products to the inventory.
- View and search products using their SKU.
- Update product details and stock quantities.
- Purchase products and automatically reduce available stock.
- View inventory changes in real time using WebSockets.
- Track connected peer nodes.
- Handle incoming inventory updates using timestamp-based conflict resolution.
- AI-powered purchasing chatbot using Google's Gemini API (requires configuration).

## How It Works

1. The user interacts with the React frontend.
2. The frontend communicates with the Spring Boot backend through REST APIs.
3. Spring Boot handles inventory operations and stores data in PostgreSQL.
4. WebSockets send inventory updates to connected clients.
5. The frontend updates automatically when inventory changes occur.

## Running the Project

### Prerequisites

- Java 17 or newer
- Node.js and npm
- PostgreSQL
- Maven (or the included Maven wrapper)

### 1. Set Up PostgreSQL

Create a database named `stocksync`.

### 2. Configure the Backend

Open `src/main/resources/application.yml` and configure your PostgreSQL connection.

Set the following environment variables:

```text
STOCKSYNC_DB_URL=jdbc:postgresql://localhost:5432/stocksync
STOCKSYNC_DB_USER=postgres
STOCKSYNC_DB_PASSWORD=your_password
```

### 3. Start the Backend

Run `StockSyncApplication.java` using IntelliJ IDEA or Spring Tool Suite.

Alternatively, use:

```bash
./mvnw spring-boot:run
```

The backend runs at `http://localhost:8080`.

### 4. Start the Frontend

Open a terminal in the project directory:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory/items` | Get all products |
| GET | `/api/inventory/items/{sku}` | Get a product by SKU |
| POST | `/api/inventory/items` | Add a product |
| PUT | `/api/inventory/items/{sku}` | Update a product |
| POST | `/api/inventory/items/{sku}/buy` | Purchase a product |
| GET | `/api/peers` | View registered peer nodes |

## Project Structure

- `frontend/` — React frontend
- `src/main/java/` — Spring Boot backend
- `src/main/resources/` — Application configuration and database migrations
- `src/test/` — Backend tests