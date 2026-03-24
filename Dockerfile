FROM golang:1.21-alpine AS builder

WORKDIR /app

# 第一层：仅复制依赖声明文件，下载依赖（这层只要 go.mod/go.sum 不变就永远命中缓存）
COPY go.mod go.sum* ./
RUN go mod download

# 第二层：复制业务代码（代码改动只重新编译，不重新下载依赖）
COPY . .

# 全量跨环境解绑静态微缩编译
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o mdshare .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
# 只将二进制可调用载体进行迁移，达到最简化防攻击微型系统
COPY --from=builder /app/mdshare .
COPY templates ./templates
COPY static ./static

# 将在 yaml 里被主导使用的访问接通孔径声明出来
EXPOSE 18080

CMD ["./mdshare"]
