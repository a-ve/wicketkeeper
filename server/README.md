# ▌▌▌ wicketkeeper - server

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Wicketkeeper is a backend service that provides a Proof-of-Work (PoW) based captcha. Instead of asking users to identify images, it requires the user's browser (the client) to perform a small computational task. This task is difficult enough to slow down bots and automated scripts but simple enough to be unnoticeable by human users on modern devices.

This system is built with Go and leverages Redis (specifically the RedisBloom module) for highly efficient, time-windowed replay attack prevention.

## Features

- **Proof-of-Work (PoW):** A crypto-based challenge that is easy to verify but requires computational effort to solve.
- **JWT-Based Challenges:** Challenges are issued as signed JSON Web Tokens (JWTs), ensuring they are tamper-proof and stateless from the server's perspective.
- **Replay Attack Prevention:** Uses Redis Bloom filters to prevent a single solved challenge from being submitted multiple times, a common vulnerability in captcha systems.
- **Configurable Difficulty:** The computational difficulty of the challenge can be adjusted via an environment variable.
- **Configurable CORS:** Restrict which domains can request challenges, with support for subdomains.
- **Secure Key Management:** Automatically generates and persists an Ed25519 key pair for signing tokens.

---

## How It Works: The Captcha Flow

The entire process involves the client (e.g., a user's browser) and the Wicketkeeper server.

1.  **Challenge Request:**

    - A client needs to prove it's not a bot (e.g., before submitting a form). It makes a `GET` request to the Wicketkeeper server's `/v0/challenge` endpoint.
    - The server generates a unique **Challenge ID (CID)** and a difficulty level (e.g., "find a hash with 4 leading zeros").
    - It bundles the `cid`, `difficulty`, and an expiry timestamp into a JWT, which it signs with its private key.
    - The server sends this JWT back to the client.

2.  **Client-Side Work (Proof-of-Work):**

    - The client's browser receives the JWT and the challenge details.
    - It starts a loop in JavaScript. In each iteration, it:
      - Generates a random string or number called a **nonce**.
      - Concatenates the `cid` with the `nonce`.
      - Calculates the SHA-256 hash of the concatenated string.
      - Checks if the resulting hash meets the difficulty requirement (e.g., starts with `0000`).
    - This loop continues until a valid `nonce` is found.

3.  **Verification Request:**

    - Once the client finds a valid `nonce` and the corresponding hash, it makes a `POST` request to the server's `/v0/siteverify` endpoint.
    - The request body contains the original JWT, the `nonce` it found, and the resulting hash (`response`).

4.  **Server-Side Validation:**

    - The server receives the verification request and performs several checks:
      1.  **JWT Validity:** It verifies the JWT's signature using its public key. This proves the challenge was issued by this server and hasn't been altered. It also checks that the token hasn't expired.
      2.  **Proof-of-Work Correctness:** It re-calculates the SHA-256 hash using the `cid` (from the JWT) and the `nonce` (from the request). It checks if this hash matches the `response` sent by the client and meets the difficulty requirement.
      3.  **Replay Prevention:** It checks if the `cid` has been used before. It uses a time-based Bloom filter key (e.g., `captcha:spent:20231027T1504`). If the `cid` is already in the filter for that time slice, the request is rejected. If not, the `cid` is added to the filter, and the request proceeds.

5.  **Success Token:**
    - If all checks pass, the server generates a new **success JWT**. This token certifies that the captcha was solved correctly.
    - The client receives this success token. It can now include this token in its original request (e.g., the form submission) to the application's main backend, proving that the user is likely human.

---

## Getting Started

### Prerequisites

1.  **Go:** Version 1.23 or later.
2.  **Redis with RedisBloom:** The system relies on the `BF.ADD` and `BF.EXISTS` commands. The easiest way to get this is by using the **Redis Stack** Docker image.

### 1. Set up Redis

You can run an instance of Redis Stack easily with Docker:

```bash
docker run -d --name wicketkeeper-redis -p 6379:6379 redis/redis-stack:latest
```

This will start a Redis container with the Bloom filter module included.

### 2. Configure the Server

The server is configured using environment variables. You can create a `.env` file and use a tool like `godotenv` or export them directly in your shell.

| Variable           | Description                                                                                                                                                                                            | Default              | Example                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------- |
| `LISTEN_PORT`      | The port on which the server will listen for requests.                                                                                                                                                 | `8080`               | `8080`                                          |
| `REDIS_ADDR`       | The address of the Redis instance.                                                                                                                                                                     | `127.0.0.1:6379`     | `localhost:6379`                                |
| `REDIS_DB`         | Redis database number (0-15). **Note:** Redis Cluster only supports DB 0.                                                                                                                              | `0`                  | `1`                                             |
| `DIFFICULTY`       | The number of leading zeros required in the PoW hash. Higher is harder.                                                                                                                                | `4`                  | `5`                                             |
| `ALLOWED_ORIGINS`  | Comma-separated list of origins allowed for CORS. Use `*` for all. Supports wildcards like `*.domain.com`.                                                                                             | `*`                  | `https://myapp.com,https://*.staging.myapp.com` |
| `BASE_PATH`        | Base path for the server. Note: For paths other than `/` you should use `data-challenge-url` when using the client. See [here](https://wicketkeeper.io/components/frontend-widget.html#configuration). | `/`                  | `/captcha`                                      |
| `PRIVATE_KEY_PATH` | Path to the file where the Ed25519 private key is stored. It will be created if it doesn't exist.                                                                                                      | `./wicketkeeper.key` | `/etc/secrets/wicketkeeper.key`                 |

**Example Shell Export:**

```bash
export LISTEN_PORT=8080
export REDIS_ADDR="127.0.0.1:6379"
export DIFFICULTY=4
export ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3001"
export PRIVATE_KEY_PATH="./wicketkeeper.key"
```

### 3. Run the Server

Navigate to the `server/` directory and run the application:

```bash
# In the server/ directory
go mod tidy
go run .
```

On first run, it will generate a `wicketkeeper.key` file in the same directory. You should see output similar to this:

```
INFO: Private key file ./wicketkeeper.key not found. Generating a new key pair.
INFO: New Ed25519 private key generated and saved to ./wicketkeeper.key
INFO: Successfully connected to Redis at 127.0.0.1:6379.
INFO: Captcha Service Public Key (hex): a1b2c3d4...
INFO: Wicketkeeper service listening on :8080 …
INFO: Global Difficulty: 4
INFO: Allowed Origins: [http://localhost:3000 http://127.0.0.1:3001]
```

The server is now running and ready to accept requests.

---

## API Endpoints

### `GET /v0/challenge`

Requests a new captcha challenge.

- **Method:** `GET`
- **Response (Success 200):**

```json
{
  "challenge": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "difficulty": 4,
  "token": "eyJhbGciOiJFZERTQSIs...<challenge_jwt>..."
}
```

### `POST /v0/siteverify`

Submits a solved challenge for verification.

- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "token": "eyJhbGciOiJFZERTQSIs...<challenge_jwt>...",
  "nonce": "12345",
  "response": "0000a9b8c7d6e5f4...<sha256_hash>..."
}
```

- **Response (Success 200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJFZERTQSIs...<success_jwt>...",
  "challenge": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "timestamp": "2023-10-27T15:30:00Z"
}
```

- **Response (Failure 4xx/5xx):**
  A JSON object with an error message. Status codes include `400` (Bad Request), `403` (Forbidden/Invalid), and `500` (Internal Server Error).
