package handler

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"path"
	"strings"
	"time"

	"mdshare/render"
	"mdshare/storage"
)

var tmpl *template.Template

func init() {
	var err error
	tmpl, err = template.ParseGlob("templates/*.html")
	if err != nil {
		log.Println("警告：无法全量解析加载模板资源 html，请检查 templates/ 资源状态！", err)
	}
}

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

func CreatePageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "仅允许提交表单数据", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 5<<20) 
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "系统拒接处理异常请求或由于传输尺寸超出预期", http.StatusBadRequest)
		return
	}
	
	mdContent := r.FormValue("markdown")
	if strings.TrimSpace(mdContent) == "" {
		http.Error(w, "拒绝空文档进行占位分享提交！", http.StatusBadRequest)
		return
	}

	// 解开用户下放的高阶控制组件安全指令
	isBurn := r.FormValue("is_burn") == "true"
	withPwd := r.FormValue("with_password") == "true"
	expireStr := r.FormValue("expire_time")

	var expireDuration time.Duration
	switch expireStr {
	case "5m": expireDuration = 5 * time.Minute
	case "1h": expireDuration = time.Hour
	case "6h": expireDuration = 6 * time.Hour
	case "24h": expireDuration = 24 * time.Hour
	case "7d": expireDuration = 7 * 24 * time.Hour
	case "30d": expireDuration = 30 * 24 * time.Hour
	}

	safeHTML, err := render.MarkdownToHTML([]byte(mdContent))
	if err != nil {
		http.Error(w, "将转换到目标显示语法时产生了内部抛出拦截", http.StatusInternalServerError)
		return
	}

	id, pwd, err := storage.SavePage(mdContent, safeHTML, isBurn, expireDuration, withPwd)
	if err != nil {
		http.Error(w, "数据库接纳发生问题", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	schema := "http://"
	if r.TLS != nil {
		schema = "https://"
	}
	
	host := r.Host
	if fh := r.Header.Get("X-Forwarded-Host"); fh != "" {
		host = fh
	}

	responseCtx := map[string]string{
		"id":  id,
		"url": fmt.Sprintf("%s%s/p/%s", schema, host, id),
	}
	if pwd != "" {
		responseCtx["pwd"] = pwd
	}
	
	json.NewEncoder(w).Encode(responseCtx)
}

func ViewPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "不允许此操作接连此数据源节点", http.StatusMethodNotAllowed)
		return
	}
	
	id := path.Base(r.URL.Path)
	if id == "" || id == "p" {
		http.NotFound(w, r)
		return
	}

	pageData, err := storage.GetPage(id)
	if err != nil {
		if tmpl != nil {
			tmpl.ExecuteTemplate(w, "page.html", map[string]interface{}{"HTML": template.HTML(fmt.Sprintf("<h3 style='text-align:center; margin-top: 3rem;'>💥 访问中断响应拦截：目前无法查找到该资源内容，它可能已被阅读后即焚逻辑抹杀或者因为超期执行了自然生命收割解体回收销毁工作！</h3>"))})
		}
		return
	}
	
	// 对于启用了前置安全锁止模块的信息进入鉴权门禁检验
	if pageData.Password != "" {
		if r.Method == http.MethodGet {
			if tmpl != nil {
				tmpl.ExecuteTemplate(w, "password.html", map[string]interface{}{"ID": id})
			}
			return
		} else if r.Method == http.MethodPost {
			r.ParseForm()
			if r.FormValue("pwd") != pageData.Password {
				if tmpl != nil {
					tmpl.ExecuteTemplate(w, "password.html", map[string]interface{}{"ID": id, "Error": "拒绝出示内容的通行放权：该专属验证密码口令被推翻拦截判断为了非法猜测输入状态！"})
				}
				return
			}
		}
	}

	// 行进到展示逻辑且如果是单次查收安全设置则直接物理毁尸灭迹避免暴露
	if pageData.IsBurn {
		storage.DeletePage(id)
	}

	if tmpl != nil {
		tmpl.ExecuteTemplate(w, "page.html", map[string]interface{}{
			"ID":        pageData.ID,
			"CreatedAt": pageData.CreatedAt,
			"HTML":      template.HTML(pageData.HTML),
		})
	} else {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(pageData.HTML))
	}
}
