package storage

import (
	"database/sql"
	"errors"
	"log"
	"time"

	_ "modernc.org/sqlite"
)

type Page struct {
	ID        string
	Markdown  string
	HTML      string
	CreatedAt time.Time
}

var DB *sql.DB

// InitDB 对接挂载卷数据库缓存服务，建立或使用目标表格存放。
func InitDB(dataSourceName string) {
	var err error
	DB, err = sql.Open("sqlite", dataSourceName)
	if err != nil {
		log.Fatalf("无法连接数据库: %v", err)
	}

	createTableQuery := `
	CREATE TABLE IF NOT EXISTS pages (
		id TEXT PRIMARY KEY,
		markdown TEXT NOT NULL,
		html TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err = DB.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("创建数据表失败: %v", err)
	}
}

// SavePage 会自动寻找新的无冲突随机字符作 ID，落盘存储该次转换完成数据。
func SavePage(markdown, html string) (string, error) {
	var id string
	
	// 设置自动避免碰撞的最多次尝试安全冗余设定
	for i := 0; i < 5; i++ {
		newID, err := GenerateID(8)
		if err != nil {
			return "", err
		}
		
		var exists bool
		err = DB.QueryRow("SELECT EXISTS(SELECT 1 FROM pages WHERE id = ?)", newID).Scan(&exists)
		if err != nil {
			return "", err
		}
		if !exists {
			id = newID
			break
		}
	}
	
	if id == "" {
		return "", errors.New("无法成功分配空闲短链接访问 ID")
	}

	_, err := DB.Exec("INSERT INTO pages (id, markdown, html) VALUES (?, ?, ?)", id, markdown, html)
	return id, err
}

// GetPage 对查询单条已生成的页详细记录请求的反馈执行
func GetPage(id string) (*Page, error) {
	var p Page
	err := DB.QueryRow("SELECT id, markdown, html, created_at FROM pages WHERE id = ?", id).
		Scan(&p.ID, &p.Markdown, &p.HTML, &p.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("页面不存在")
		}
		return nil, err
	}
	return &p, nil
}
