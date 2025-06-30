package main

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/rs/cors"
)

//go:embed static/*
var assets embed.FS
var FS, _ = fs.Sub(assets, "static")

func serveJS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=2628000") // 1 month
	w.Header().Set("Content-Type", "application/javascript")

	data, err := fs.ReadFile(FS, r.URL.Path[1:]) // Path only have 2 value /fast.js and /slow.js
	if err != nil {
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	// Change the default challenge URL when served by Go binary 
	modified := bytes.ReplaceAll(data, []byte("http://localhost:8080"), []byte(scheme + "://" + r.Host))
	w.Write(modified)
}

func loadOrGeneratePrivateKey(filePath string) (ed25519.PrivateKey, ed25519.PublicKey, error) {
	keyDataHex, err := os.ReadFile(filePath)
	if err == nil {
		privKeyBytes, decodeErr := hex.DecodeString(strings.TrimSpace(string(keyDataHex)))
		if decodeErr != nil {
			return nil, nil, fmt.Errorf("failed to decode private key from hex in %s: %w", filePath, decodeErr)
		}

		if len(privKeyBytes) != ed25519.PrivateKeySize {
			log.Printf("WARN: Private key file %s content has invalid size. Will regenerate key.", filePath)
		} else {
			privKey := ed25519.PrivateKey(privKeyBytes)
			pubKey, ok := privKey.Public().(ed25519.PublicKey)
			if !ok {
				return nil, nil, fmt.Errorf("failed to derive public key from private key in %s", filePath)
			}
			log.Printf("Loaded Ed25519 private key from %s", filePath)
			return privKey, pubKey, nil
		}
	} else if !os.IsNotExist(err) {
		return nil, nil, fmt.Errorf("error reading private key file %s: %w", filePath, err)
	}

	if os.IsNotExist(err) {
		log.Printf("Private key file %s not found. Generating a new key pair.", filePath)
	} else {
		log.Printf("Existing private key file %s was invalid or malformed. Generating a new key pair.", filePath)
	}

	pubKey, privKey, genErr := ed25519.GenerateKey(rand.Reader)
	if genErr != nil {
		return nil, nil, fmt.Errorf("failed to generate ed25519 key pair: %w", genErr)
	}

	privKeyHex := hex.EncodeToString(privKey)
	if writeErr := os.WriteFile(filePath, []byte(privKeyHex), 0600); writeErr != nil {
		return nil, nil, fmt.Errorf("failed to write private key to %s: %w", filePath, writeErr)
	}
	log.Printf("New Ed25519 private key generated and saved to %s", filePath)
	return privKey, pubKey, nil
}

func main() {
	difficultyStr := os.Getenv("DIFFICULTY")
	difficulty, err := strconv.Atoi(difficultyStr)
	if err != nil || difficulty <= 0 {
		difficulty = 4
		log.Printf("DIFFICULTY not set or invalid ('%s'), using default: %d", difficultyStr, difficulty)
	}

	allowedOriginsStr := os.Getenv("ALLOWED_ORIGINS")
	var allowedOriginsList []string
	if allowedOriginsStr == "" {
		allowedOriginsList = []string{"*"}
		log.Printf("ALLOWED_ORIGINS not set, using default: %v", allowedOriginsList)
	} else {
		allowedOriginsList = strings.Split(allowedOriginsStr, ",")
		for i, origin := range allowedOriginsList {
			allowedOriginsList[i] = strings.TrimSpace(origin)
		}
		log.Printf("ALLOWED_ORIGINS configured: %v", allowedOriginsList)
	}

	privateKeyPath := os.Getenv("PRIVATE_KEY_PATH")
	if privateKeyPath == "" {
		privateKeyPath = "./wicketkeeper.key"
		log.Printf("PRIVATE_KEY_PATH not set, using default: %s", privateKeyPath)
	}

	privKey, pubKey, err := loadOrGeneratePrivateKey(privateKeyPath)
	if err != nil {
		log.Fatalf("Failed to load or generate private key: %v", err)
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
		log.Printf("REDIS_ADDR not set, using default: %s", redisAddr)
	}

	srv, err := NewServer(difficulty, allowedOriginsList, privKey, pubKey, redisAddr)
	if err != nil {
		log.Fatalf("Failed to initialize server: %v", err)
	}
	defer func() {
		log.Println("Closing server resources...")
		if err := srv.Close(); err != nil {
			log.Printf("Error closing server resources: %v", err)
		}
	}()

	log.Printf("Captcha Service Public Key (hex): %s", hex.EncodeToString(pubKey))

	mux := http.NewServeMux()
	mux.HandleFunc("/v0/challenge", srv.BuildChallenge)
	mux.HandleFunc("/v0/siteverify", srv.VerifyChallenge)
	mux.HandleFunc("/fast.js", serveJS)
	mux.HandleFunc("/slow.js", serveJS)

	c := cors.New(cors.Options{
		AllowedOrigins: srv.allowedOrigins,
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowedHeaders: []string{"Content-Type", "X-Requested-With"},
		ExposedHeaders: []string{},
		MaxAge:         3600,
		Debug:          os.Getenv("CORS_DEBUG") == "true",
	})

	handler := c.Handler(mux)

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	port := os.Getenv("LISTEN_PORT")
	if port == "" {
		port = "8080"
		log.Printf("LISTEN_PORT not set, using default: %s", port)
	}

	addr := fmt.Sprintf(":%s", port)

	httpServer := &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	go func() {
		log.Printf("Wicketkeeper service listening on %s …", httpServer.Addr)
		log.Printf("Global Difficulty: %d", srv.difficulty)
		log.Printf("Allowed Origins: %v", srv.allowedOrigins)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Could not listen on %s: %v\n", httpServer.Addr, err)
		}
	}()

	<-stopChan
	log.Println("Shutting down server due to interrupt signal...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server graceful shutdown failed: %v", err)
	}
	log.Println("Server shut down gracefully.")
}
