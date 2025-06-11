package main

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type Server struct {
	priv           ed25519.PrivateKey // Server's private key for signing JWTs.
	pub            ed25519.PublicKey  // Server's public key for verifying JWTs (can be distributed).
	difficulty     int                // Global PoW difficulty for challenges.
	allowedOrigins []string           // List of allowed origins for CORS.
	redisClient    *redis.Client      // Redis client for storing challenge state.
	checkAddScript *redis.Script      // Lua script for atomically checking and adding CIDs to Bloom filters.
}

func NewServer(difficulty int, allowedOrigins []string, privKey ed25519.PrivateKey, pubKey ed25519.PublicKey, redisAddr string) (*Server, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	var checkAddScript = redis.NewScript(`
	        local cid = ARGV[1]
	        if redis.call('BF.EXISTS', KEYS[1], cid) == 1 then
	            return 0
	        end
	        redis.call('BF.ADD', KEYS[1], cid)
	        return 1
	    `)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := rdb.Ping(ctx).Result(); err != nil {
		log.Printf("Could not connect to Redis at %s: %v", redisAddr, err)
		return nil, fmt.Errorf("could not connect to Redis at %s: %w", redisAddr, err)
	}
	log.Printf("Successfully connected to Redis at %s.", redisAddr)

	_, err := rdb.Do(ctx, "BF.RESERVE", "test_bloom_support", 0.01, 1000, "NONSCALING").Result()
	if err != nil {
		if !strings.Contains(strings.ToLower(err.Error()), "item exists") {
			log.Printf("WARNING: Redis Bloom filter module not available: %v", err)
			log.Printf("Please install RedisBloom module or use Redis Stack")
			return nil, fmt.Errorf("redis bloom filter module not available: %w", err)
		}
	} else {
		rdb.Del(ctx, "test_bloom_support")
	}

	return &Server{
		priv:           privKey,
		pub:            pubKey,
		difficulty:     difficulty,
		allowedOrigins: allowedOrigins,
		redisClient:    rdb,
		checkAddScript: checkAddScript,
	}, nil
}

func (s *Server) Close() error {
	if s.redisClient != nil {
		log.Println("Closing Redis client connection.")
		return s.redisClient.Close()
	}
	return nil
}
