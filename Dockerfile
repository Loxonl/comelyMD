FROM golang:1.21-alpine AS builder

WORKDIR /app

# 【全量大编译隔离层】只复制配置以执行拉取解压锁定机制
COPY go.mod ./
RUN go mod tidy && go mod download

# 这里放之后频繁变动的业务源码，因为上个缓存层未变，即使小规模二次封装重建也快如闪电
COPY . .
# 基于 modernc/sqlite 实现 CGO_ENABLED=0 免交叉编译工具链打包方案
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o mdshare .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
# 只将二进制可调用载体进行迁移，达到最简化防攻击微型系统
COPY --from=builder /app/mdshare .
COPY templates ./templates

# 将在 yaml 里被主导使用的访问接通孔径声明出来
EXPOSE 18080

CMD ["./mdshare"]
