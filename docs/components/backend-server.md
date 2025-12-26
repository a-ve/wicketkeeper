# Backend Server

The Wicketkeeper backend is a high-performance Go service responsible for issuing and verifying Proof-of-Work (PoW) challenges. It is designed to be stateless, scalable, and secure.

## Overview

The server exposes two primary API endpoints:

- `GET /v0/challenge`: Issues a new, unique PoW challenge packaged in a signed JSON Web Token (JWT).
- `POST /v0/siteverify`: Verifies a solved challenge submitted by a client.

It relies on a Redis instance with the **RedisBloom** module for efficient, time-windowed replay attack prevention.

## Deployment

The recommended way to deploy the Wicketkeeper server and its Redis dependency is using Docker. A `docker-compose.yaml` file is provided for a streamlined setup.

### Using Docker Compose (Recommended)

1.  **Navigate to the `server` directory:**

    ```bash
    cd server/
    ```

2.  **Create a data directory:**
    The server needs a persistent volume to store its private key.

    ```bash
    mkdir data
    ```

3.  **Start the services:**
    ```bash
    docker-compose up -d
    ```
    This command will:
    - Build a production-ready Docker image for the Go application.
    - Start a `wicketkeeper-app` container running the Go server.
    - Start a `wicketkeeper-redis` container using the `redis/redis-stack-server` image, which includes the required Bloom filter commands.
    - Connect both services on a dedicated Docker network.

### From Source

If you prefer to run the server directly without Docker:

1.  **Ensure Redis is running:**
    You must have a Redis instance (v6.2+) with the RedisBloom module installed and accessible to the server. A standard Redis Stack instance works perfectly.

    ```bash
    # Example using Docker to run Redis Stack separately
    docker run -d --name wicketkeeper-redis -p 6379:6379 redis/redis-stack:latest
    ```

2.  **Set Environment Variables:**
    Configure the server using environment variables (see the [Configuration](#configuration) section below).

    ```bash
    export LISTEN_PORT=8080
    export REDIS_ADDR="127.0.0.1:6379"
    export DIFFICULTY=4
    export ALLOWED_ORIGINS="http://localhost:3000"
    ```

3.  **Run the application:**
    From the `server/` directory:
    ```bash
    go mod tidy
    go run .
    ```

## Configuration

The server is configured entirely through environment variables.

| Variable           | Description                                                                                                                                                                                            | Default              |
| :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------- |
| `LISTEN_PORT`      | The port on which the server will listen for HTTP requests.                                                                                                                                            | `8080`               |
| `REDIS_ADDR`       | The address (host:port) of the Redis instance.                                                                                                                                                         | `127.0.0.1:6379`     |
| `REDIS_USER`       | Redis username (if using [ACL](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)).                                                                                          | none                 |
| `REDIS_PASSWORD`   | Redis password (if using ACL or the legacy authentication method).                                                                                                                                     | none                 |
| `REDIS_DB`         | Redis database number (0-15). **Note:** Redis Cluster only supports DB 0.                                                                                                                              | `0`                  |
| `DIFFICULTY`       | The number of leading zero nibbles (4-bit chunks) for the PoW hash. A higher number increases the computational difficulty.                                                                            | `4`                  |
| `ALLOWED_ORIGINS`  | A comma-separated list of origins allowed for Cross-Origin Resource Sharing (CORS). Use `*` to allow all origins.                                                                                      | `*`                  |
| `BASE_PATH`        | Base path for the server. Note: For paths other than `/` you should use `data-challenge-url` when using the client. See [here](https://wicketkeeper.io/components/frontend-widget.html#configuration). | `/`                  |
| `PRIVATE_KEY_PATH` | Path to the file where the Ed25519 private key is stored. It will be created if it doesn't exist.                                                                                                      | `./wicketkeeper.key` |
| `CORS_DEBUG`       | Set to `true` to enable verbose CORS debugging logs.                                                                                                                                                   | `false`              |

### Example `.env` file for `docker-compose`

When using `docker-compose`, you can create a `.env` file in the `server/` directory to manage these variables:

```dotenv
# .env
UID=1000
GID=1000

LISTEN_PORT=8080
REDIS_ADDR=redis:6379
DIFFICULTY=4
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://your-app.com
PRIVATE_KEY_PATH=/data/wicketkeeper.key
```

::: tip Note on UID/GID
The `UID` and `GID` variables in the `docker-compose.yaml` are used to run the Go process as your current user instead of `root`, which is a security best practice. This ensures that files created in the mounted `/data` volume (like `wicketkeeper.key`) have the correct ownership.
:::

## Key Management

The Wicketkeeper server uses an **Ed25519** key pair for signing and verifying JWTs.

- **Generation**: On the first startup, if the file specified by `PRIVATE_KEY_PATH` does not exist, the server will automatically generate a new private key and save it to that location.
- **Persistence**: It is **critical** to persist this key file. If the key changes, all in-flight challenges will become invalid. When using Docker, this is handled by mounting a volume to the path where the key is stored (e.g., `- ./data:/data`).
- **Security**: The private key file should be treated as a secret and have its permissions restricted (e.g., `0600`).
