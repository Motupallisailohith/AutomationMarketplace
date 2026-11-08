package main

import (
	"database/sql"
	"fmt"
	"os"
	
	_ "github.com/lib/pq"
)

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	var dbURL string
	
	// Check if DATABASE_URL is set first
	if url := os.Getenv("DATABASE_URL"); url != "" {
		dbURL = url
		fmt.Printf("Using DATABASE_URL: %s\n", dbURL)
	} else {
		// Fallback to individual environment variables
		host := getEnvOrDefault("DB_HOST", "localhost")
		port := getEnvOrDefault("DB_PORT", "5432")
		user := getEnvOrDefault("DB_USER", "platform_user")
		password := getEnvOrDefault("DB_PASSWORD", "platform_password")
		dbname := getEnvOrDefault("DB_NAME", "automation_platform")
		sslmode := getEnvOrDefault("DB_SSL_MODE", "disable")

		dbURL = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode)
		fmt.Printf("Using built connection string: %s\n", dbURL)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		fmt.Printf("Error opening database: %v\n", err)
		return
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		fmt.Printf("Error pinging database: %v\n", err)
		return
	}

	fmt.Println("Database connection successful!")
}