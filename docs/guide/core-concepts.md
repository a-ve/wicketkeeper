# Core Concepts

Wicketkeeper is built on a few core principles and technologies that make it both secure and user-friendly. Understanding these concepts will help you appreciate how the system works and how to best integrate it.

## Proof-of-Work (PoW)

Instead of asking a human to perform a task (like identifying traffic lights), Wicketkeeper asks their browser to perform one. This is the "Proof-of-Work".

- **The Challenge**: The server provides a unique, random string called a `challenge` and a `difficulty` number (e.g., 4).
- **The Work**: The client's browser must find a number, called a `nonce`, such that the SHA-256 hash of (`challenge` + `nonce`) starts with the required number of zeros.
- **The Result**: Finding this `nonce` requires brute-force computation. A modern web browser can find a solution for a reasonable difficulty in a second or two without impacting the user experience. However, a bot attempting to solve thousands of these challenges per minute would require significant, and therefore expensive, computational resources.
- **The Verification**: Verifying the solution is extremely fast. The server simply concatenates the original `challenge` with the `nonce` provided by the client, computes a single hash, and checks if it meets the difficulty requirement.

This asymmetry—easy to verify, hard to solve at scale—is the foundation of Wicketkeeper's bot protection.

## Stateless JWT-Based Flow

Wicketkeeper is designed to be stateless, meaning the server doesn't need to store session information about who it issued a challenge to. This is achieved using **JSON Web Tokens (JWTs)** signed with an **Ed25519** key pair.

1.  **Challenge Token**: When the client requests a challenge, the server creates a JWT containing the `challenge` ID (`cid`), the `difficulty`, and an expiry timestamp (`exp`). This token is signed with the server's private key.
2.  **Tamper-Proofing**: When your backend sends the solution for verification, it includes this original token. The Wicketkeeper server uses its public key to verify the signature. This guarantees that the challenge details (like difficulty) haven't been tampered with by the client.
3.  **Success Token**: After a successful verification, the server issues a _new_ success token. Your application backend can trust this token as definitive proof that the captcha was solved correctly within a recent timeframe.

This flow eliminates the need for a database table to track issued challenges, making the system horizontally scalable and easier to manage.

## Replay Attack Prevention with Bloom Filters

A "replay attack" is when an attacker solves a captcha once and then "replays" or re-submits the same valid solution multiple times to bypass protection. Wicketkeeper prevents this with a high-performance data structure called a **Bloom Filter**, provided by Redis.

- **Time-Windowed Keys**: The server doesn't use one giant Bloom filter. Instead, it creates a new filter for each time slice (e.g., every minute). The key for the filter is based on the timestamp when the challenge was issued (e.g., `captcha:spent:20231027T1504`).
- **Check-Then-Add**: When a solution is submitted, the server identifies the correct time-slice key from the JWT's `iat` (issued at) claim. It then atomically performs two operations using a Lua script in Redis:
  1.  It checks if the `challenge` ID (`cid`) **exists** in the filter for that time slice. If it does, the challenge has already been used, and the request is rejected.
  2.  If it doesn't exist, the `cid` is **added** to the filter, marking it as used.
- **Efficiency**: Bloom filters are probabilistic data structures that are incredibly space-efficient. They can tell you if an item _might be_ in a set or _is definitely not_ in a set. There's a tiny chance of a false positive (thinking a new challenge has been used), but Wicketkeeper configures this to be extremely low (e.g., 1%). There are **no false negatives**, meaning it will never fail to detect a replayed challenge.
- **Automatic Expiry**: Each time-sliced filter is automatically set to expire in Redis after a short period (e.g., 12 minutes), ensuring the system doesn't accumulate data forever.
