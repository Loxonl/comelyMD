package handler

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"path"
	"strings"

	"mdshare/render"
	"mdshare/storage"
)

var tmpl *template.Template

func init() {
	var err error
	tmpl, err = template.ParseGlob("templates/*.html")
	if err != nil {
		// 在初始阶段或者用户删除模板时仅提示警告，避免导致服务奔溃
		log.Println("警告：无法全量解析加载模板资源 html，请检查 templates/ 资源状态！", err)
	}
}

// IndexHandler 负责给访客和用户直面展现带有提交组件的主页视图。
func IndexHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	if tmpl != nil {
		tmpl.ExecuteTemplate(w, "index.html", nil)
	} else {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write([]byte("基础 Markdown 服务运行正常，但在寻找前端核心模板时暂未定位相关界面。"))
	}
}

// CreatePageHandler 处理通过 Ajax 发送到这里的 markdown 分享正文内容并持久化，最后返回分享码链接特征信息。
func CreatePageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "仅允许提交表单数据", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 5<<20) // 对接收文档强制设置保护最高界限为带富文本容错的 5MB
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "系统拒接处理异常请求或由于传输尺寸超出预期", http.StatusBadRequest)
		return
	}
	
	mdContent := r.FormValue("markdown")
	if strings.TrimSpace(mdContent) == "" {
		http.Error(w, "拒绝空文档进行占位分享提交！", http.StatusBadRequest)
		return
	}

	safeHTML, err := render.MarkdownToHTML([]byte(mdContent))
	if err != nil {
		log.Printf("解析拦截层爆出了意外解析停止失败: %v", err)
		http.Error(w, "将转换到目标显示语法时产生了内部抛出拦截", http.StatusInternalServerError)
		return
	}

	id, err := storage.SavePage(mdContent, safeHTML)
	if err != nil {
		log.Printf("向本地写入分享源和清洗后的呈现块时出现了致命阻碍: %v", err)
		http.Error(w, "数据库接纳发生问题", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	schema := "http://"
	if r.TLS != nil {
		schema = "https://"
	}
	
	// 判断是否有前置反代环境(X-Forwarded-Host)，用作兼容真实链接组装
	host := r.Host
	if fh := r.Header.Get("X-Forwarded-Host"); fh != "" {
		host = fh
	}

	responseCtx := map[string]string{
		"id":  id,
		"url": fmt.Sprintf("%s%s/p/%s", schema, host, id),
	}
	
	json.NewEncoder(w).Encode(responseCtx)
}

// ViewPageHandler 负责检索通过请求传入路径匹配并渲染之前清洗沉淀的已安全分享文件
func ViewPageHandler(w http.ResponseWriter, r *http.Request) {
	id := path.Base(r.URL.Path)
	if id == "" || id == "p" {
		http.NotFound(w, r)
		return
	}

	pageData, err := storage.GetPage(id)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	if tmpl != nil {
		tmpl.ExecuteTemplate(w, "page.html", map[string]interface{}{
			"ID":        pageData.ID,
			"CreatedAt": pageData.CreatedAt,
			"HTML":      template.HTML(pageData.HTML),
		})
	} else {
		// 作兜底保护直出保障服务稳定可用（即使样式丢弃）
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(pageData.HTML))
	}
}
