# API Reference

This page provides a detailed technical specification for the Wicketkeeper server's API endpoints. All communication with the API should use JSON.

## `GET /v0/challenge`

Issues a new Proof-of-Work challenge to be solved by the client.

- **Method:** `GET`
- **Description:** A client-side widget calls this endpoint to receive a unique challenge, a difficulty level, and a signed JWT containing this information.

---

### Response (200 OK)

A JSON object containing the challenge details.

```json
{
  "challenge": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "difficulty": 4,
  "token": "eyJhbGciOiJFZERTQSIs...<challenge_jwt>..."
}
```

**Fields:**

| Field        | Type     | Description                                                                                                                                                                   |
| :----------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `challenge`  | `string` | A unique, 16-byte random hex-encoded string. This is the core "Challenge ID" (`cid`).                                                                                         |
| `difficulty` | `number` | An integer representing the required number of leading zero nibbles in the solution hash.                                                                                     |
| `token`      | `string` | A signed [EdDSA](https://en.wikipedia.org/wiki/EdDSA) JWT containing the `challenge`, `difficulty`, and expiry information. This token must be sent back during verification. |

## `POST /v0/siteverify`

Verifies a solved challenge submitted by your application's backend. This is a secure server-to-server call.

- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Description:** Your backend sends the solution provided by the client to this endpoint. The Wicketkeeper server validates the JWT, checks the PoW hash, and uses a Bloom filter to prevent replay attacks.

---

### Request Body

A JSON object containing the full solution from the client.

```json
{
  "token": "eyJhbGciOiJFZERTQSIs...<challenge_jwt>...",
  "nonce": "12345",
  "response": "0000a9b8c7d6e5f4...<sha256_hash>..."
}
```

**Fields:**

| Field      | Type     | Description                                                                                 |
| :--------- | :------- | :------------------------------------------------------------------------------------------ |
| `token`    | `string` | The original JWT received from the `/v0/challenge` endpoint.                                |
| `nonce`    | `string` | The nonce (as a string) found by the client that satisfies the PoW requirement.             |
| `response` | `string` | The resulting SHA-256 hash (as a 64-character lowercase hex string) of `challenge + nonce`. |

---

### Response (200 OK - Success)

If verification succeeds, the server returns a JSON object with `success: true` and a new success token.

```json
{
  "success": true,
  "token": "eyJhbGciOiJFZERTQSIs...<success_jwt>...",
  "challenge": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "timestamp": "2023-10-27T15:30:00Z"
}
```

**Fields:**

| Field       | Type      | Description                                                                                                                                                                              |
| :---------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success`   | `boolean` | Always `true` for a successful verification. **This is the primary field your backend should check.**                                                                                    |
| `token`     | `string`  | A _new_ JWT certifying that the challenge was successfully solved. This token has a short expiry (e.g., 5 minutes) and can be used for further server-to-server communication if needed. |
| `challenge` | `string`  | The original `cid` of the challenge that was verified.                                                                                                                                   |
| `timestamp` | `string`  | An ISO 8601 timestamp indicating when the verification occurred.                                                                                                                         |

---

### Response (4xx/5xx - Failure)

If verification fails for any reason, the server returns an appropriate HTTP status code and a plain text error message. Your backend should check for a non-200 status code.

- **`400 Bad Request`**: The request was malformed (e.g., missing fields, bad JSON, invalid hash format).
- **`403 Forbidden`**: The solution was invalid (e.g., wrong PoW hash, expired token, challenge already used).
- **`500 Internal Server Error`**: A problem occurred on the Wicketkeeper server (e.g., it could not connect to Redis).
