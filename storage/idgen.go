package storage

import (
	"crypto/rand"
	"math/big"
)

const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const pwdCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// GenerateID 依据指定长度返回高安级别的随机 Base62 字符组合。
func GenerateID(length int) (string, error) {
	b := make([]byte, length)
	charLen := big.NewInt(int64(len(charset)))
	for i := range b {
		n, err := rand.Int(rand.Reader, charLen)
		if err != nil {
			return "", err
		}
		b[i] = charset[n.Int64()]
	}
	return string(b), nil
}

// GeneratePassword 生成用于阅读加密的高阶四字独立随机提取门禁暗语
func GeneratePassword(length int) (string, error) {
	b := make([]byte, length)
	charLen := big.NewInt(int64(len(pwdCharset)))
	for i := range b {
		n, err := rand.Int(rand.Reader, charLen)
		if err != nil {
			return "", err
		}
		b[i] = pwdCharset[n.Int64()]
	}
	return string(b), nil
}
