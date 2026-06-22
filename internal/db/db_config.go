package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	_ "modernc.org/sqlite"
)


type DBConfig struct {
	Conn *sql.DB
}


func DBConnection() (*sql.DB, error) {

	err := godotenv.Load()
	if err != nil {
		return nil, fmt.Errorf("could not read env file \n %w", err)
	}

	dbPath := os.Getenv("SQLITE_DB_PATH")
	if dbPath == "" {
		dbPath = "oovah.db"
	}

	// Ensure the parent directory exists so SQLite can create the file
	dir := filepath.Dir(dbPath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create database directory: \n %w", err)
		}
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to start db: \n %w", err)
	}

	// Verify the database is reachable
	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("unable to ping db: \n %w", err)
	}

	return db, nil

}

func NewDBConnection(dbConn * sql.DB) *DBConfig {
	return &DBConfig{
		Conn: dbConn,
	}
}