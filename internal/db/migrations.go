package db

import (
	"database/sql"
	"fmt"
	"io/fs"
	"sort"

	"embed"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunMigrations executes any SQL migration files that have not yet been applied.
func RunMigrations(db *sql.DB) error {
	// Create a tracking table so migrations are only applied once.
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS migrations (
			filename VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	files, err := fs.Glob(migrationsFS, "migrations/*.sql")
	if err != nil {
		return fmt.Errorf("failed to read migrations: %w", err)
	}
	sort.Strings(files)

	for _, file := range files {
		var applied bool
		err := db.QueryRow("SELECT 1 FROM migrations WHERE filename = ?", file).Scan(&applied)
		if err == nil {
			continue // already applied
		}

		content, err := migrationsFS.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", file, err)
		}

		_, err = db.Exec(string(content))
		if err != nil {
			return fmt.Errorf("failed to run migration %s: %w", file, err)
		}

		_, err = db.Exec("INSERT INTO migrations (filename) VALUES (?)", file)
		if err != nil {
			return fmt.Errorf("failed to record migration %s: %w", file, err)
		}
	}

	return nil
}
