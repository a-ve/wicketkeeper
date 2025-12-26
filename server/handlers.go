package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	jwtTTL         = 10 * time.Minute   // Lifespan of the initial challenge JWT.
	clockSkew      = 2 * time.Minute    // Grace period for clock differences when validating JWT expiry.
	sliceDuration  = 1 * time.Minute    // Duration of each time window for Bloom filter keys.
	retention      = jwtTTL + clockSkew // How long data for a time slice (e.g., Bloom filter) is kept.
	bloomErrorRate = 0.01               // Target false-positive rate for Bloom filters (1%).
	bloomCapacity  = 500_000            // Expected number of unique CIDs per sliceDuration for Bloom filter sizing.
)

func bloomKey(t time.Time) string {
	rounded := t.UTC().Truncate(sliceDuration)
	return fmt.Sprintf("spent:%s", rounded.Format("20060102T1504"))
}

func (s *Server) ensureBloom(ctx context.Context, key string) error {
	// Create the filter only if it does not yet exist.
	_, err := s.redisClient.Do(ctx,
		"BF.RESERVE", key, bloomErrorRate, bloomCapacity,
		"NONSCALING", "NX").Result()

	if err != nil && !strings.Contains(strings.ToLower(err.Error()), "item exists") {
		return fmt.Errorf("redis BF.RESERVE %s failed: %w", key, err)
	}

	// set the TTL exactly once so the key disappears after `retention`.
	if err == nil {
		if _, err := s.redisClient.Expire(ctx, key, retention).Result(); err != nil {
			return fmt.Errorf("redis EXPIRE %s failed: %w", key, err)
		}
		log.Printf("INFO: initialized global Bloom filter %q (TTL %s)", key, retention)
	}
	return nil
}

func (s *Server) BuildChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Generate a unique Challenge ID (CID).
	cidBytes := make([]byte, 16)
	if _, err := rand.Read(cidBytes); err != nil {
		http.Error(w, "failed to generate challenge ID", http.StatusInternalServerError)
		return
	}
	cid := hex.EncodeToString(cidBytes)

	// Create JWT claims for the challenge.
	claims := jwt.MapClaims{
		"cid":  cid,
		"diff": s.difficulty,
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(jwtTTL).Unix(),
	}
	// Sign the JWT with the server's private key.
	token, err := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims).SignedString(s.priv)
	if err != nil {
		http.Error(w, "failed to sign challenge token", http.StatusInternalServerError)
		return
	}

	// Response structure for a new challenge.
	resp := struct {
		Challenge  string `json:"challenge"`
		Difficulty int    `json:"difficulty"`
		Token      string `json:"token"`
	}{cid, s.difficulty, token}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type VerifyRequestBody struct {
	Token    string `json:"token"`    // The JWT received from BuildChallenge.
	Nonce    string `json:"nonce"`    // The nonce found by the client.
	Response string `json:"response"` // The hex-encoded SHA256 hash (proof-of-work).
}

// VerifyChallenge handles requests to verify a solved PoW captcha.
// It validates the challenge JWT, checks the PoW, and uses a Redis Bloom
// filter keyed by the JWT's iat minute-slice to prevent replay attacks.
func (s *Server) VerifyChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	ctype := r.Header.Get("Content-Type")
	var req VerifyRequestBody
	if strings.HasPrefix(strings.ToLower(ctype), "application/json") {
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
			http.Error(w, "failed to parse json: "+err.Error(), http.StatusBadRequest)
			return
		}
	} else if strings.HasPrefix(strings.ToLower(ctype), "application/x-www-form-urlencoded") {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "failed to parse form data: "+err.Error(), http.StatusBadRequest)
			return
		}
		req = VerifyRequestBody{
			Token:   r.FormValue("token"),
			Nonce:   r.FormValue("nonce"),
			Response: r.FormValue("response"),
		}
	} else {
		http.Error(w, "invalid content type", http.StatusUnsupportedMediaType)
		return
	}

	if req.Token == "" && req.Nonce == "" && req.Response != "" {
		err := json.Unmarshal([]byte(req.Response), &req)
		if err != nil {
			http.Error(w, "failed to parse response:"+err.Error(), http.StatusBadRequest)
			return
		}
	}

	if req.Token == "" || req.Nonce == "" || req.Response == "" {
		http.Error(w, "token, challenge, nonce, and response fields are required", http.StatusBadRequest)
		return
	}

	// Validate and parse the JWT
	tok, err := jwt.Parse(req.Token, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.pub, nil
	})
	if err != nil || !tok.Valid {
		http.Error(w, "invalid or expired challenge token", http.StatusForbidden)
		return
	}
	claims := tok.Claims.(jwt.MapClaims)

	cid, _ := claims["cid"].(string)
	diffF, _ := claims["diff"].(float64)
	diff := int(diffF)

	// Verify Proof-of-Work
	respLower := strings.ToLower(req.Response)
	if len(respLower) != 64 {
		http.Error(w, "response must be a 64-character hex-encoded SHA256 hash", http.StatusBadRequest)
		return
	}
	respBytes, err := hex.DecodeString(respLower)
	if err != nil {
		http.Error(w, "response is not a valid hex string", http.StatusBadRequest)
		return
	}

	expectedHash := sha256.Sum256([]byte(cid + req.Nonce))
	if subtle.ConstantTimeCompare(respBytes, expectedHash[:]) != 1 {
		http.Error(w, "proof-of-work hash mismatch", http.StatusForbidden)
		return
	}
	if !strings.HasPrefix(respLower, strings.Repeat("0", diff)) {
		http.Error(w, "insufficient work; difficulty not met", http.StatusForbidden)
		return
	}

	// Anti-replay: Bloom filter keyed by JWT iat-slice
	ctx := r.Context()

	iatF, ok := claims["iat"].(float64)
	if !ok {
		http.Error(w, "iat claim missing or invalid", http.StatusForbidden)
		return
	}
	iatTime := time.Unix(int64(iatF), 0).UTC()
	sliceKey := s.redisPrefix + bloomKey(iatTime)

	if err := s.ensureBloom(ctx, sliceKey); err != nil {
		http.Error(w, "bloom filter initialization error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	added, err := s.checkAddScript.Run(ctx, s.redisClient,
		[]string{sliceKey}, // KEYS[1]
		cid,                // ARGV[1]
	).Int()
	if err != nil {
		log.Printf("Redis Lua script error: %v", err)
		http.Error(w, "redis error during CID verification: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if added == 0 {
		http.Error(w, "challenge already used or recently submitted", http.StatusForbidden)
		return
	}

	// Issue success token
	jtiBytes := make([]byte, 16)
	if _, err := rand.Read(jtiBytes); err != nil {
		http.Error(w, "failed to generate success token ID", http.StatusInternalServerError)
		return
	}

	successClaims := jwt.MapClaims{
		"cid":     cid,
		"iat":     time.Now().Unix(),
		"exp":     time.Now().Add(5 * time.Minute).Unix(),
		"jti":     hex.EncodeToString(jtiBytes),
		"success": true,
	}
	successToken, err := jwt.NewWithClaims(jwt.SigningMethodEdDSA, successClaims).SignedString(s.priv)
	if err != nil {
		http.Error(w, "failed to generate success token", http.StatusInternalServerError)
		return
	}

	// All good. Send a success token
	resp := struct {
		Success   bool   `json:"success"`
		Token     string `json:"token"`
		Challenge string `json:"challenge"`
		Timestamp string `json:"timestamp"`
	}{
		Success:   true,
		Token:     successToken,
		Challenge: cid,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
