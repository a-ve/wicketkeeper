# FAQ / Troubleshooting

Here are some answers to common questions and solutions for problems you might encounter while setting up or using Wicketkeeper.

### Why am I getting a CORS error in my browser?

:::details Answer
A Cross-Origin Resource Sharing (CORS) error means your Wicketkeeper server is rejecting requests from the domain where your frontend is hosted.

**Solution:** You must explicitly tell the Wicketkeeper server which domains are allowed to request challenges. Configure the `ALLOWED_ORIGINS` environment variable on the server.

- **For local development**, if your web app is running on `http://localhost:3000`, you should set:

  ```bash
  ALLOWED_ORIGINS="http://localhost:3000"
  ```

- **For production**, if your app is at `https://www.myapp.com`, you should set:

  ```bash
  ALLOWED_ORIGINS="https://www.myapp.com"
  ```

- **Multiple Origins:** You can provide a comma-separated list for multiple environments:
  `bash
    ALLOWED_ORIGINS="https://www.myapp.com,https://staging.myapp.com,http://localhost:3000"
    `
  :::

### The server fails to start with a "Redis Bloom filter module not available" error. What's wrong?

:::details Answer
This error means your Redis instance does not have the **RedisBloom** module loaded, which provides the `BF.ADD` and `BF.EXISTS` commands required for replay attack prevention.

**Solution:** The easiest way to fix this is to use the official Redis Stack Docker image, which includes all major modules by default. The provided `docker-compose.yaml` file already uses it:

```yaml
# server/docker-compose.yaml
services:
  redis:
    image: redis/redis-stack-server:latest # This image has the Bloom filter module
    ...
```

If you are managing your own Redis installation, you will need to [manually load the RedisBloom module](https://redis.io/docs/stack/bloom/quick_start/).
:::

### My form submissions are failing with a "challenge already used" error. Why?

:::details Answer
This `403 Forbidden` error indicates that the replay protection mechanism is working correctly. It means a valid solution for a specific challenge was submitted more than once. This can happen for a few reasons:

1.  **Double-Clicking:** A user might accidentally click the "Submit" button twice in quick succession. The first request succeeds, but the second one is rejected as a replay.
2.  **Browser Retries:** Some browser extensions or network issues might cause a request to be retried automatically.
3.  **An Actual Replay Attack:** An attacker is attempting to reuse a solved challenge.

**Solution:** While Wicketkeeper correctly blocks the redundant request, you can improve the user experience by disabling the submit button on your form after the first click.
:::

### How do I change the captcha difficulty?

:::details Answer
You can adjust the computational difficulty of the Proof-of-Work challenge by setting the `DIFFICULTY` environment variable on the **Wicketkeeper server**.

```bash
# Example: Increase difficulty
export DIFFICULTY=5
```

- **What it means:** The `DIFFICULTY` is the number of leading zero nibbles (4-bit chunks) required in the solution hash. Each increment roughly increases the average solve time by a factor of 16.
- **Trade-off:**
  - **Higher difficulty** is more secure against powerful bots but takes longer to solve and consumes more CPU on the user's device.
  - **Lower difficulty** is faster for the user but easier for bots to overcome at scale.
- The default of `4` is a reasonable starting point. Adjust based on your specific threat model.
  :::

### What is `wicketkeeper.key` and should I commit it to Git?

:::details Answer
The `wicketkeeper.key` file contains the **private key** for the Ed25519 cryptographic pair. The server uses this key to sign all challenge JWTs.

**NEVER commit this file to Git or expose it publicly.**

It is a secret and must be protected. If an attacker gets your private key, they can sign their own challenge tokens and completely bypass the captcha.

**Best Practice:**

- Add the key's path (e.g., `wicketkeeper.key`, `server/data/`) to your `.gitignore` file.
- In production, manage this file using a secure method like Docker secrets, Kubernetes secrets, or a mounted volume from a secure location on the host machine. The provided `docker-compose.yaml` uses a mounted volume (`./data:/data`) for this purpose.
:::