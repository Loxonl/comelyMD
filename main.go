package main

import (
	"log"
	"os"

	"mdshare/handler"
	"mdshare/storage"
)

func main() {
	// 加载持久化保护，以环境变量声明位置优先加载否则向容下写入映射
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/app.db"
		
		if _, err := os.Stat("./data"); os.IsNotExist(err) {
			err = os.MkdirAll("./data", os.ModePerm)
			if err != nil {
				log.Fatalf("无法预先建设持久化所需数据源数据安全保存文件夹: %v", err)
			}
		}
	}

	storage.InitDB(dbPath)
	log.Printf("成功接入数据库进行基础载入，相关目标文件定位： %s", dbPath)

	port := os.Getenv("PORT")
	if port == "" {
		port = "18080"
	}

	addr := ":" + port
	handler.Run(addr)
}
