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
	IsBurn    bool
	ExpiresAt *time.Time
	Password  string
	CreatedAt time.Time
}

var DB *sql.DB

// InitDB 对接挂载卷数据库缓存服务，建立并升级对应的核心高阶隐私数据列方案以支持动态表查询。
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
		log.Fatalf("创建数据主干总表崩溃失败: %v", err)
	}

	// 利用 ALTER TABLE 执行在后续高阶方案发布系统更新上的数据横向拓展兼容写入，遇上冲突自抑制
	_, _ = DB.Exec("ALTER TABLE pages ADD COLUMN is_burn BOOLEAN DEFAULT FALSE;")
	_, _ = DB.Exec("ALTER TABLE pages ADD COLUMN expires_at DATETIME;")
	_, _ = DB.Exec("ALTER TABLE pages ADD COLUMN password TEXT;")

	// 触发定时清理回收线程
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			DB.Exec("DELETE FROM pages WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP")
		}
	}()
}

// SavePage 对参数进行兼容接收保护落成存储数据库并回吐双密匙组合。
func SavePage(markdown, html string, isBurn bool, expireDuration time.Duration, withPassword bool) (string, string, error) {
	var id string
	
	// 设置自动避免碰撞的最多次尝试安全冗余设定
	for i := 0; i < 5; i++ {
		newID, err := GenerateID(8)
		if err != nil {
			return "", "", err
		}
		var exists bool
		err = DB.QueryRow("SELECT EXISTS(SELECT 1 FROM pages WHERE id = ?)", newID).Scan(&exists)
		if err != nil {
			return "", "", err
		}
		if !exists {
			id = newID
			break
		}
	}
	
	if id == "" {
		return "", "", errors.New("无法成功分配空闲短链接访问 ID 极低可能性的报错暴露")
	}

	var nullPwd sql.NullString
	if withPassword {
		nullPwd.Valid = true
		nullPwd.String, _ = GeneratePassword(4)
	}

	var nullExpires sql.NullTime
	if expireDuration > 0 {
		nullExpires.Valid = true
		nullExpires.Time = time.Now().UTC().Add(expireDuration)
	}

	_, err := DB.Exec(`INSERT INTO pages (id, markdown, html, is_burn, expires_at, password) VALUES (?, ?, ?, ?, ?, ?)`, 
		id, markdown, html, isBurn, nullExpires, nullPwd)
		
	return id, nullPwd.String, err
}

// GetPage 对查询单条记录提供并实施拦截、自动时间验证校验以维护保护措施的安全。
func GetPage(id string) (*Page, error) {
	var p Page
	var rawExpires sql.NullTime
	var rawPassword sql.NullString
	
	err := DB.QueryRow("SELECT id, markdown, html, is_burn, expires_at, password, created_at FROM pages WHERE id = ?", id).
		Scan(&p.ID, &p.Markdown, &p.HTML, &p.IsBurn, &rawExpires, &rawPassword, &p.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("寻找失效，系统拒绝呈现未声明查回数据包")
		}
		return nil, err
	}
	
	if rawExpires.Valid {
		p.ExpiresAt = &rawExpires.Time
	}
	if rawPassword.Valid {
		p.Password = rawPassword.String
	}
	
	// 核实动态到期的防守条件
	if p.ExpiresAt != nil && time.Now().UTC().After(*p.ExpiresAt) {
		DeletePage(id)
		return nil, errors.New("拦截触发：您访问的正文已经正式被执行超期摧毁拦截被抹杀！")
	}
	
	return &p, nil
}

// DeletePage 在针对诸如立即销毁状态或者定时巡检发生时暴露出独立的拦截执行操作
func DeletePage(id string) {
	DB.Exec("DELETE FROM pages WHERE id = ?", id)
}
