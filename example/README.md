# Wicketkeeper Demo

A simple Express + TypeScript demo showing how to integrate Wicketkeeper into a web form and validate submissions on the server side.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Usage](#usage)

  - [Build & Run](#build--run)
  - [Serve Static Files](#serve-static-files)

- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [License](#license)

---

## Features

- Integrate Wicketkeeper in the browser.
- Server‑side verification of Wicketkeeper payload via HTTP POST.
- TypeScript‑powered Express server with full type safety.
- Static hosting of HTML, CSS, and JS assets.
- Simple form handling for name, email, and Wicketkeeper response.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- [npm](https://www.npmjs.com/) v8+ or [Yarn](https://yarnpkg.com/)
- A running instance of the Wicketkeeper verification service

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/a-ve/wicketkeeper.git
   cd wicketkeeper
   ```

2. **Run the server**

   ```bash
   cd server
   go run .
   ```

3. **Build the front‑end widget**

   ```bash
   cd client
   npm install
   npm run build:fast
   cp dist/wicketkeeper.js ../example/public/
   ```

---

## Configuration

Create or update your environment variables:

```bash
export PORT=3000
export VERIFY_URL=http://localhost:8080/v0/siteverify
```

- `PORT` — port on which the Express server listens (default: `3000`).
- `VERIFY_URL` — URL of the Wicketkeeper verification endpoint.

---

## Project Structure

```
example/
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ public/
│  ├─ index.html
│  └─ wicketkeeper.js      ← Built client script
├─ src/
│  └─ server.ts            ← Express server & verification logic
└─ dist/                   ← Compiled JavaScript output
```

---

## Usage

### Build & Run

Compile TypeScript and start the server:

```bash
npx tsc
node dist/server.js
```

### Serve Static Files

From the `public` directory, run:

```bash
npx serve
```

---

## Environment Variables

| Variable     | Default                               | Description                              |
| ------------ | ------------------------------------- | ---------------------------------------- |
| `PORT`       | `8081`                                | Port on which the Express server listens |
| `VERIFY_URL` | `http://localhost:8080/v0/siteverify` | Wicketkeeper verification endpoint URL   |

---

## API Reference

### `POST /submit`

Handles form submissions.

- **Request Body** (JSON or URL‑encoded):

  ```json
  {
    "name": "Alice",
    "email": "alice@example.com",
    "wicketkeeper_response": "{\"token\":\"...\",\"nonce\":123,\"response\":\"...\"}"
  }
  ```

- **Responses**:

  - **200 OK**: form and response valid

    ```text
    Thanks, Alice! We've received your email (alice@example.com).
    ```

  - **400 Bad Request**: missing or invalid Wicketkeeper response

    ```text
    ⚠️ Missing Wicketkeeper response
    ```

    ```text
    ⚠️ Invalid Wicketkeeper payload
    ```

    ```text
    🚫 Wicketkeeper verification failed
    ```

  - **500 Internal Server Error**: verification service error

    ```text
    ❌ Verification service error
    ```

---

## License

This project is licensed under the [MIT License](LICENSE).

---
