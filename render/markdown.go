package render

import (
	"bytes"
	"fmt"
	"html" // 标准库防 XSS 转义
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	html_renderer "github.com/yuin/goldmark/renderer/html"
)

var (
	displayMathRe = regexp.MustCompile(`(?s)\$\$[^\$]+\$\$`)
	inlineMathRe  = regexp.MustCompile(`\$[^\$\n]+\$`)
)

// MarkdownToHTML 接入一段原始文档生成能给前端安全呈现的安全代码段。
func MarkdownToHTML(source []byte) (string, error) {
	// 【防御第一线】拦截数学公式防止其内部语法（如 _ 和 *）被错误格式化
	mathBlocks := make(map[string][]byte)
	counter := 0

	source = displayMathRe.ReplaceAllFunc(source, func(match []byte) []byte {
		placeholder := fmt.Sprintf("COMELYMATHDISPLAY%dENDMATH", counter)
		mathBlocks[placeholder] = match
		counter++
		return []byte(placeholder)
	})

	source = inlineMathRe.ReplaceAllFunc(source, func(match []byte) []byte {
		placeholder := fmt.Sprintf("COMELYMATHINLINE%dENDMATH", counter)
		mathBlocks[placeholder] = match
		counter++
		return []byte(placeholder)
	})

	// 1. 初始化标准兼容的 Markdown 标签结构器处理并转换
	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM), // 提供对诸如 Table 或 Delete 等拓展的 GFM 转义支持
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html_renderer.WithHardWraps(), // 当遇见强制换行时转换
			html_renderer.WithUnsafe(),    // 开启 html 留存 (供下面蓝月亮拦截接管去杂去黑处理)
		),
	)

	var buf bytes.Buffer
	if err := md.Convert(source, &buf); err != nil {
		return "", err
	}

	// 2. 将解析好的全结构进行 UGCPolicy 去注入标签安全截停清理机制执行
	p := bluemonday.UGCPolicy()
	
	// 在保持拦截下放开口子: 维持诸如代码的高亮标注显示能力 (通过类映射)
	p.AllowAttrs("class").OnElements("code", "pre", "span")
	p.AllowAttrs("id").OnElements("h1", "h2", "h3", "h4", "h5", "h6") // 为标题提供锚点支持
	
	safeHTML := string(p.SanitizeBytes(buf.Bytes()))

	// 【反防第二线】恢复纯净的数学公式并对其进行基础的 HTML Escape 安全化注入文本流
	for placeholder, original := range mathBlocks {
		escapedMath := html.EscapeString(string(original))
		safeHTML = strings.Replace(safeHTML, placeholder, escapedMath, 1)
	}

	return safeHTML, nil
}
