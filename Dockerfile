FROM golang:1.21-alpine AS builder

WORKDIR /app

# 业务代码与所有依赖一并同步置入
COPY . .

# 因为此前的本地测试未包含 Go 实体配置丢失了真正的物理 go.sum
# 必须拿到了全盘源码后，依靠构建机的自带编译系统将计算自动补齐所有缺失！
RUN go mod tidy

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
