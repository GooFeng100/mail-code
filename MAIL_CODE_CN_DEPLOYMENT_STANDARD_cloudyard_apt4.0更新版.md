# mail-code 国内服务器标准部署与维护文档（cloudyard.cn）

> 版本：2026-05-31 标准整理版（本地完整参数版）  
> 项目：`mail-code-app`  
> 适用场景：国内云服务器从 0 部署、已有服务器维护、后期更新、备份、恢复、HTTPS、App WGT 热更新。  
> 当前策略：主线部署不依赖 SOCKS5；Gmail IMAP 当前可直连时保持 `MAIL_PROXY_ENABLED=false`。Tailscale / SOCKS5 只作为可选增强。

---

> ⚠️ 本文件为“本地完整参数版”，已包含 Gmail 应用专用密码、MongoDB 密码、JWT、管理员密码等敏感信息。仅建议保存在本地电脑、NAS 私有目录或离线备份中，不要提交到任何代码仓库或公开位置。

## 0. 文档使用原则

### 0.1 本文档做了哪些标准化

本版把原部署文档整理为更适合长期维护的标准格式：

1. 删除部署工具相关内容，保留真正需要的部署、更新、备份、恢复、检查步骤。
2. 将“首次部署”和“已有服务器维护”分开，避免误操作生产环境。
3. 保留 `cloudyard.cn` 作为网站访问域名，保留 `889100.xyz` 作为验证码邮件域名。
4. SOCKS5 / Tailscale 不再作为主线前置条件，只放到可选章节。
5. 本地完整参数版已直接填入当前服务器使用的 MongoDB 密码、Gmail 应用专用密码、JWT、管理员密码等敏感信息，方便复制部署。
6. 所有文件创建步骤按照实际部署顺序排列，不提前在文档顶部创建运行文件。
7. 强化验证步骤：每个阶段完成后必须先验证，再进入下一阶段。
8. 明确 `restart`、`force-recreate`、`--build` 的使用场景。
9. 明确 MongoDB 只备份数据库，不备份软件实际文件；NAS 本地保留最近 3 个备份。
10. 增加已有服务器接入规则：正式服务器不要重新执行 `full`，只使用更新、备份、健康检查等维护动作。

### 0.2 严禁全局替换域名

不要把 `889100.xyz` 全局替换成 `cloudyard.cn`。

```text
889100.xyz     = 验证码邮件域名，继续用于 Cloudflare Email Routing / Catch-all
www.cloudyard.cn = Web 管理端访问域名
m.cloudyard.cn   = uniapp H5 / App 热更新访问域名
```

`.env.prod` 中必须保持：

```env
MAIL_DOMAIN_CONFIG=[{"domain":"889100.xyz","verificationCodeUrl":"www.cloudyard.cn"}]
```

### 0.3 本地完整参数版说明

本文件已按当前服务器实际使用值填入敏感参数，方便本地直接复制部署。请注意：

```text
1. 本文件只保存在本地电脑或私有备份目录。
2. 不要上传到 GitHub、Gitee、公开网盘、公开论坛或发送给他人。
3. 如果以后更换 MongoDB 密码、Gmail 应用专用密码、管理员密码或 JWT_SECRET，需要同步更新本文档。
4. 如果旧服务器 MongoDB 密码不同，执行旧服务器备份/迁移步骤时需要手动替换为旧服务器实际密码。
```

当前已填入的关键值：

```text
中国服务器公网 IP：139.196.15.215
MongoDB 用户名：mailcode
MongoDB 密码：mailcode_change_this_password
JWT_SECRET：change_this_to_a_long_random_string
后台管理员用户名：admin
后台管理员密码：admin123456
Gmail 用户：adobesaleteam@gmail.com
Gmail 应用专用密码：tqhclwkgaerosgts
```

如需重新生成随机密钥：

```bash
openssl rand -hex 32
```

---

## 1. 最终架构

```text
用户浏览器 / App
  ↓
阿里云 DNS
  ↓
中国服务器 Nginx 80/443
  ├─ www.cloudyard.cn
  │    ├─ /              /opt/apps/mail-code-app/repo/web-admin/dist
  │    ├─ /api           http://127.0.0.1:3002
  │    └─ /socket.io     http://127.0.0.1:3002
  │
  └─ m.cloudyard.cn
       ├─ /              /opt/apps/mail-code-app/repo/uniapp/dist/build/h5
       ├─ /api           http://127.0.0.1:3002
       ├─ /socket.io     http://127.0.0.1:3002
       └─ /app-updates   /opt/apps/mail-code-app/app-updates

Docker 容器
  ├─ mail-code-app       Node API，只绑定 127.0.0.1:3002
  ├─ mail-code-db        MongoDB，不暴露公网
  └─ mail-code-redis     Redis，不暴露公网

邮件链路
  任意地址@889100.xyz
      ↓
  Cloudflare Email Routing Catch-all
      ↓
  Gmail
      ↓
  mail-code-app 通过 IMAP 轮询 Gmail
      ↓
  前端展示验证码
```

---

## 2. 标准部署顺序

```text
基础环境阶段
第 1 步：服务器初始化
第 2 步：安装基础工具
第 3 步：配置 UFW 防火墙
第 4 步：安装 Docker
第 5 步：配置 Docker 镜像源
第 6 步：安装 Nginx

代码与容器阶段
第 7 步：配置 DNS 解析器和 GitHub SSH
第 8 步：拉取项目仓库
第 9 步：创建运行目录和 .env.prod
第 10 步：创建 Dockerfile.cn
第 11 步：创建 docker-compose.prod.yml
第 12 步：拉取基础镜像
第 13 步：构建后端镜像
第 14 步：构建 web-admin
第 15 步：构建 uniapp H5
第 16 步：启动容器

Nginx / 域名 / HTTPS 阶段
第 17 步：配置 Nginx HTTP
第 18 步：DNS 与 HTTP 验证
第 19 步：备案通过后申请 HTTPS

数据与维护阶段
第 20 步：恢复 / 迁移 MongoDB 数据
第 21 步：创建中国服务器 MongoDB 备份脚本
第 22 步：创建后期更新脚本 deploy-cn.sh
第 23 步：创建 App WGT 热更新脚本
第 24 步：创建 Gmail 检测脚本

可选增强
第 25 步：Tailscale / SOCKS5 美国出口
第 26 步：NAS 通过 Tailscale 拉取 MongoDB 备份
```

---

## 3. 服务器初始化

推荐配置：

```text
Ubuntu Server 22.04 LTS 或 24.04 LTS
CPU：2 核以上
内存：4GB 以上
硬盘：60GB 以上
```

阿里云安全组：

```text
放行 TCP 22    建议只允许你的本地公网 IP
放行 TCP 80    0.0.0.0/0
放行 TCP 443   0.0.0.0/0
不要放行 3000 / 3001 / 3002 / 27017 / 6379 / 1080
```

登录服务器：

```bash
ssh root@139.196.15.215
```

设置时区：

```bash
timedatectl set-timezone Asia/Shanghai
timedatectl
date
```

---

## 4. 安装基础工具

### 4.0 先修复 Ubuntu apt 源

本次实际部署中遇到的问题是：系统默认的 Ubuntu 源残留为 `mirrors.cloud.aliyuncs.com/ubuntu`，访问 `100.100.2.148:80` 超时。即使 `apt update` 最后显示 `Reading package lists... Done`，只要出现下面这类提示，就说明源没有真正正常：

```text
Failed to fetch http://mirrors.cloud.aliyuncs.com/ubuntu/...
Some index files failed to download. They have been ignored, or old ones used instead.
```

因此，在安装基础工具、Docker、Nginx、Certbot 之前，先统一修复 Ubuntu apt 源。

#### 4.0.1 备份当前 apt 源

```bash
BACKUP_DIR="/root/apt-source-backup-$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp -a /etc/apt/sources.list "$BACKUP_DIR/sources.list.bak" 2>/dev/null || true
cp -a /etc/apt/sources.list.d "$BACKUP_DIR/sources.list.d.bak" 2>/dev/null || true
```

#### 4.0.2 获取 Ubuntu 版本代号

```bash
. /etc/os-release
echo "$VERSION_CODENAME"
```

Ubuntu 24.04 通常输出：

```text
noble
```

#### 4.0.3 写入新的 Ubuntu 源

使用阿里云公开源：

```bash
cat > /etc/apt/sources.list.d/ubuntu.sources <<EOF
Types: deb
URIs: https://mirrors.aliyun.com/ubuntu
Suites: ${VERSION_CODENAME} ${VERSION_CODENAME}-updates ${VERSION_CODENAME}-backports ${VERSION_CODENAME}-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF
```

#### 4.0.4 清理旧的 mirrors.cloud.aliyuncs.com 残留源

先查看是否还有旧源：

```bash
grep -R "mirrors.cloud.aliyuncs.com/ubuntu" -n /etc/apt \
  --include="*.list" \
  --include="*.sources" || true
```

如果有输出，统一替换为阿里云公开源：

```bash
find /etc/apt -type f \( -name "*.list" -o -name "*.sources" \) \
  -exec sed -i 's#http://mirrors.cloud.aliyuncs.com/ubuntu#https://mirrors.aliyun.com/ubuntu#g' {} \;

find /etc/apt -type f \( -name "*.list" -o -name "*.sources" \) \
  -exec sed -i 's#https://mirrors.cloud.aliyuncs.com/ubuntu#https://mirrors.aliyun.com/ubuntu#g' {} \;
```

再次确认旧源已清理：

```bash
grep -R "mirrors.cloud.aliyuncs.com/ubuntu" -n /etc/apt \
  --include="*.list" \
  --include="*.sources" || echo "✅ 旧源已清理干净"
```

#### 4.0.5 处理重复源配置

如果同时存在：

```text
/etc/apt/sources.list
/etc/apt/sources.list.d/ubuntu.sources
```

并且两边都配置了 Ubuntu 源，`apt update` 会出现：

```text
Target Packages ... is configured multiple times
```

此时保留新的 `/etc/apt/sources.list.d/ubuntu.sources`，禁用旧的 `/etc/apt/sources.list`：

```bash
if grep -qE '^deb .*ubuntu' /etc/apt/sources.list 2>/dev/null; then
  mv /etc/apt/sources.list /etc/apt/sources.list.bak.$(date +%F-%H%M%S)

  cat > /etc/apt/sources.list <<'EOF'
# Disabled.
# Ubuntu sources are managed in:
# /etc/apt/sources.list.d/ubuntu.sources
EOF
fi
```

#### 4.0.6 清理缓存并重新更新

```bash
apt clean
rm -rf /var/lib/apt/lists/*
apt update
```

正常结果应该只看到类似下面的源：

```text
https://mirrors.aliyun.com/ubuntu
https://mirrors.aliyun.com/docker-ce/linux/ubuntu
https://pkgs.tailscale.com/stable/ubuntu
```

不应再出现：

```text
mirrors.cloud.aliyuncs.com
Failed to fetch
configured multiple times
Some index files failed to download
```

确认无异常后，再继续安装基础工具。

### 4.1 安装基础工具

```bash
apt upgrade -y

apt install -y \
  curl wget git unzip vim nano htop ca-certificates gnupg lsb-release \
  ufw fail2ban jq tar zip dnsutils net-tools iproute2 openssl cron rsync \
  build-essential python3 python3-pip whois
```

验证：

```bash
git --version
curl --version
jq --version
whois --version || true
```

---

## 5. 配置 UFW 防火墙

先放行必要端口：

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
```

启用防火墙前，建议另开一个 SSH 窗口确认能登录。确认后执行：

```bash
ufw enable
ufw status verbose
```

验证 SSH 监听：

```bash
ss -tulnp | grep ':22'
```

如果后续启用 Tailscale，再增加：

```bash
ufw allow in on tailscale0 to any port 22 proto tcp
ufw reload
```

---

## 6. 安装 Docker

### 6.1 清理失败残留源

```bash
rm -f /etc/apt/sources.list.d/docker.sources
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.asc
rm -f /etc/apt/keyrings/docker.gpg
rm -f /usr/share/keyrings/docker-archive-keyring.gpg

apt update
```

### 6.2 添加阿里云 Docker CE 源

```bash
apt install -y ca-certificates curl gnupg lsb-release

install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

chmod a+r /etc/apt/keyrings/docker.gpg

cat > /etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable
EOF

apt update
```

验证源：

```bash
apt-cache policy docker-ce docker-ce-cli containerd.io docker-compose-plugin | sed -n '1,120p'
```

### 6.3 安装 Docker

```bash
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

systemctl status docker --no-pager
docker version
docker compose version
```

---

## 7. 配置 Docker 镜像源

优先使用阿里云控制台中的个人 Docker 镜像加速地址。没有个人地址时，可使用公共源测试。

```bash
mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://hub.rat.dev",
    "https://dockerpull.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  }
}
EOF

systemctl daemon-reload
systemctl restart docker
```

验证：

```bash
docker info | grep -A 10 -i "Registry Mirrors"
docker pull hello-world
docker run --rm hello-world
```

看到 `Hello from Docker!` 后继续。

---

## 8. 安装 Nginx

```bash
apt update
apt install -y nginx
systemctl enable --now nginx
```

关闭默认站点：

```bash
mkdir -p /opt/apps/nginx/backups
cp /etc/nginx/sites-available/default /opt/apps/nginx/backups/default.$(date +%F-%H%M%S).bak || true
rm -f /etc/nginx/sites-enabled/default
```

验证：

```bash
nginx -t
systemctl status nginx --no-pager
ss -tulnp | grep ':80'
curl -I http://127.0.0.1
```

---

## 9. 配置 DNS 解析器和 GitHub SSH

### 9.1 配置 systemd-resolved

不要直接编辑 `/etc/resolv.conf`。

```bash
mkdir -p /etc/systemd/resolved.conf.d

cat > /etc/systemd/resolved.conf.d/dns.conf <<'EOF'
[Resolve]
DNS=223.5.5.5 223.6.6.6 119.29.29.29 114.114.114.114
FallbackDNS=1.1.1.1 8.8.8.8
DNSStubListener=yes
EOF

systemctl restart systemd-resolved
```

验证：

```bash
cat /etc/resolv.conf
resolvectl status | sed -n '1,160p'
resolvectl query github.com
resolvectl query ssh.github.com
getent hosts github.com
getent hosts ssh.github.com
```

`/etc/resolv.conf` 里看到 `nameserver 127.0.0.53` 是正常的。

### 9.2 生成 GitHub SSH Key

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh

ssh-keygen -t ed25519 -C "aliyun-mail-code"
cat ~/.ssh/id_ed25519.pub
```

把公钥添加到 GitHub：

```text
GitHub → Settings → SSH and GPG keys → New SSH key
Title：aliyun-mail-code
Key：粘贴 id_ed25519.pub 的完整内容
```

### 9.3 GitHub SSH 走 443

```bash
cat > ~/.ssh/config <<'EOF'
Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
EOF

chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/id_ed25519 2>/dev/null || true
```

测试：

```bash
ssh -T git@github.com
```

正常结果类似：

```text
Hi GooFeng100! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 10. 拉取项目仓库

```bash
mkdir -p /opt/apps/mail-code-app
cd /opt/apps/mail-code-app

git clone git@github.com:GooFeng100/mail-code.git repo
```

切换正式分支：

```bash
cd /opt/apps/mail-code-app/repo
git fetch origin
git checkout -B main origin/main
git pull --ff-only origin main
```

验证：

```bash
git remote -v
ls -la /opt/apps/mail-code-app/repo/app
ls -la /opt/apps/mail-code-app/repo/web-admin
ls -la /opt/apps/mail-code-app/repo/uniapp
```

如果 remote 是 HTTPS，改为 SSH：

```bash
git remote set-url origin git@github.com:GooFeng100/mail-code.git
```

---

## 11. 创建运行目录和 .env.prod

创建目录：

```bash
cd /opt/apps/mail-code-app
mkdir -p mongodb-data redis-data backups app-updates scripts logs .npm-cache
```

创建 `.env.prod`：

```bash
nano /opt/apps/mail-code-app/.env.prod
```

写入：

```env
NODE_ENV=production
PORT=3000

MONGO_URL=mongodb://mailcode:mailcode_change_this_password@mail-code-db:27017/mailcode?authSource=admin
REDIS_URL=redis://mail-code-redis:6379

JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=10m
ADMIN_JWT_EXPIRES_IN=1h
ADOBE_JWT_EXPIRES_IN=10m
CODE_TTL_SECONDS=300

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123456

MAIL_DOMAIN_CONFIG=[{"domain":"889100.xyz","verificationCodeUrl":"www.cloudyard.cn"}]

# ==============================
# Gmail / IMAP 邮件验证码监听配置
# ==============================
# Gmail IMAP 服务器地址
MAIL_HOST=imap.gmail.com
# Gmail IMAP SSL 端口
MAIL_PORT=993
# 是否启用 SSL 安全连接
MAIL_SECURE=true
# Gmail 收件账号
MAIL_USER=adobesaleteam@gmail.com
# Gmail 应用专用密码
MAIL_PASS=tqhclwkgaerosgts
# 是否启用代理；当前中国服务器可直连 Gmail，所以保持 false
MAIL_PROXY_ENABLED=false
# 代理地址；未启用代理时留空
MAIL_PROXY_URL=
# 是否启用 Gmail IMAP 邮件监听；正式服务器必须为 true
MAIL_LISTENER_ENABLED=true
# 定时兜底扫描窗口：只扫描最近 5 分钟内的邮件
MAIL_SCAN_WINDOW_MINUTES=5
# 定时兜底扫描间隔：每 30 秒扫描一次，避免过高频率触发 Gmail 限制
MAIL_SCAN_INTERVAL_SECONDS=30
# Gmail exists 新邮件提醒后的防抖等待时间；1 秒后执行快速扫描
MAIL_EXISTS_DEBOUNCE_SECONDS=1
# 新邮件提醒触发 fast scan 时，最多只处理最新 3 封未处理邮件
MAIL_FAST_SCAN_MAX_CANDIDATES=3
# 定时兜底扫描时，最多处理 10 封未处理邮件，避免重复处理大量旧邮件
MAIL_SCAN_MAX_CANDIDATES=10
# Node DNS 优先使用 IPv4，减少 Gmail IMAP IPv6 连接不稳定问题
NODE_OPTIONS=--dns-result-order=ipv4first
```

设置权限：

```bash
chmod 600 /opt/apps/mail-code-app/.env.prod
```

验证：

```bash
grep -E "MONGO_URL|MAIL_PROXY_ENABLED|MAIL_DOMAIN_CONFIG|MAIL_LISTENER_ENABLED|NODE_OPTIONS" /opt/apps/mail-code-app/.env.prod
```

---

## 12. 创建 Dockerfile.cn

```bash
cat > /opt/apps/mail-code-app/repo/app/Dockerfile.cn <<'EOF'
FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV npm_config_registry=https://registry.npmmirror.com

COPY package*.json ./

RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --registry=https://registry.npmmirror.com; \
    else \
      npm install --omit=dev --registry=https://registry.npmmirror.com; \
    fi

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF
```

创建 `.dockerignore`：

```bash
cat > /opt/apps/mail-code-app/repo/app/.dockerignore <<'EOF'
node_modules
npm-debug.log
.git
.env
.env.*
Dockerfile*
coverage
.DS_Store
EOF
```

验证：

```bash
ls -lh /opt/apps/mail-code-app/repo/app/Dockerfile.cn
ls -lh /opt/apps/mail-code-app/repo/app/.dockerignore
```

---

## 13. 创建 docker-compose.prod.yml

```bash
nano /opt/apps/mail-code-app/docker-compose.prod.yml
```

写入：

```yaml
services:
  mail-code-app:
    build:
      context: ./repo/app
      dockerfile: Dockerfile.cn
    image: mail-code-app:cn
    container_name: mail-code-app
    restart: unless-stopped
    ports:
      - "127.0.0.1:3002:3000"
    env_file:
      - ./.env.prod
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - mail-code-db
      - mail-code-redis
    networks:
      - mail-code-net

  mail-code-db:
    image: mongo:7
    container_name: mail-code-db
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: mailcode
      MONGO_INITDB_ROOT_PASSWORD: mailcode_change_this_password
    volumes:
      - ./mongodb-data:/data/db
    networks:
      - mail-code-net

  mail-code-redis:
    image: redis:7-alpine
    container_name: mail-code-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - ./redis-data:/data
    networks:
      - mail-code-net

networks:
  mail-code-net:
    name: mail-code-net
    driver: bridge
```

注意：`MONGO_INITDB_ROOT_PASSWORD` 必须与 `.env.prod` 中 `MONGO_URL` 的密码一致。

验证：

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml config
```

---

## 14. 拉取基础镜像

```bash
docker pull node:20-bookworm-slim
docker pull mongo:7
docker pull redis:7-alpine
```

验证：

```bash
docker images | grep -E "node|mongo|redis"
```

---

## 15. 构建后端镜像

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml --env-file .env.prod build mail-code-app
```

验证：

```bash
docker images | grep mail-code-app
```

---

## 16. 构建 web-admin 管理端

```bash
cd /opt/apps/mail-code-app/repo/web-admin

rm -rf dist

docker run --rm \
  -v "$PWD":/app \
  -v /opt/apps/mail-code-app/.npm-cache:/root/.npm \
  -w /app \
  node:20-bookworm-slim \
  sh -c 'npm config set registry https://registry.npmmirror.com && if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm run build'
```

验证：

```bash
ls -lh /opt/apps/mail-code-app/repo/web-admin/dist
[ -f /opt/apps/mail-code-app/repo/web-admin/dist/index.html ] && echo ok
```

---

## 17. 构建 uniapp H5 移动端

```bash
cd /opt/apps/mail-code-app/repo/uniapp
cat package.json | jq .scripts
```

执行构建：

```bash
cd /opt/apps/mail-code-app/repo/uniapp

rm -rf dist/build/h5

docker run --rm \
  -v "$PWD":/app \
  -v /opt/apps/mail-code-app/.npm-cache:/root/.npm \
  -w /app \
  node:20-bookworm-slim \
  sh -c 'npm config set registry https://registry.npmmirror.com && if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm run build:h5'
```

验证：

```bash
ls -lh /opt/apps/mail-code-app/repo/uniapp/dist/build/h5
[ -f /opt/apps/mail-code-app/repo/uniapp/dist/build/h5/index.html ] && echo ok
```

如果找不到：

```bash
find /opt/apps/mail-code-app/repo/uniapp -maxdepth 5 -name index.html
```

---

## 18. 启动 Docker 容器

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

验证：

```bash
docker compose -f docker-compose.prod.yml ps
docker logs --tail=100 mail-code-app
ss -tulnp | grep ':3002'
curl -I http://127.0.0.1:3002 || true
curl http://127.0.0.1:3002/api/health || true
```

如果 app 容器不断重启：

```bash
docker logs -f mail-code-app
```

优先检查：

```text
1. .env.prod 变量名是否正确。
2. MONGO_URL 密码是否和 compose 中 Mongo 初始化密码一致。
3. mongodb-data 如果已经初始化过，修改 compose 里的 MONGO_INITDB_ROOT_PASSWORD 不会改变旧密码。
4. MAIL_PROXY_ENABLED 当前应为 false。
5. 不要在 SOCKS5 未配置时强制验证 host.docker.internal:1080。
```

---

## 19. 配置 Nginx HTTP

首次配置只写 HTTP，不要提前写 HTTPS 证书路径。

### 19.1 Web 管理端

```bash
cat > /etc/nginx/sites-available/mail-code-app.conf <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name www.cloudyard.cn;

    root /opt/apps/mail-code-app/repo/web-admin/dist;
    index index.html;

    client_max_body_size 100m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
EOF
```

### 19.2 移动端

```bash
cat > /etc/nginx/sites-available/mail-code-mobile.conf <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name m.cloudyard.cn;

    root /opt/apps/mail-code-app/repo/uniapp/dist/build/h5;
    index index.html;

    client_max_body_size 100m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /app-updates/ {
        alias /opt/apps/mail-code-app/app-updates/;
        autoindex off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
EOF
```

启用配置：

```bash
ln -sf /etc/nginx/sites-available/mail-code-app.conf /etc/nginx/sites-enabled/mail-code-app.conf
ln -sf /etc/nginx/sites-available/mail-code-mobile.conf /etc/nginx/sites-enabled/mail-code-mobile.conf

nginx -t
systemctl reload nginx
```

本机验证：

```bash
curl -I http://127.0.0.1 -H 'Host: www.cloudyard.cn'
curl -I http://127.0.0.1 -H 'Host: m.cloudyard.cn'
curl -I http://127.0.0.1/api/health -H 'Host: www.cloudyard.cn' || true
```

正常应返回：

```text
HTTP/1.1 200 OK
```

---

## 20. DNS 和 HTTP 验证

阿里云 DNS 记录：

```text
主机记录    类型    记录值
www         A       139.196.15.215
m           A       139.196.15.215
```

不需要配置 `mail.cloudyard.cn`，除非以后另有用途。

验证 DNS：

```bash
dig www.cloudyard.cn +short
dig m.cloudyard.cn +short

dig @223.5.5.5 www.cloudyard.cn +short
dig @223.5.5.5 m.cloudyard.cn +short
```

外网 HTTP 检查：

```bash
curl -I http://www.cloudyard.cn
curl -I http://m.cloudyard.cn
curl -I http://www.cloudyard.cn/api/health || true
curl -I http://m.cloudyard.cn/app-updates/version.json || true
```

可能结果：

```text
200 OK：公网 HTTP 已通。
备案拦截页：解析和公网入口已通，等待备案通过。
连接超时：检查安全组、UFW、Nginx、DNS。
```

备案未通过前，浏览器显示“域名暂时无法访问”不是 Nginx 错误。只要本机 Host 验证返回 200，说明服务器配置基本正确。

---

## 21. 备案通过后申请 HTTPS

备案未通过前不要执行 Certbot。

安装：

```bash
apt update
apt install -y certbot python3-certbot-nginx
certbot --version
```
安装成功后，先检查 HTTP：

```bash
nginx -t
systemctl reload nginx

curl -I http://www.cloudyard.cn
curl -I http://m.cloudyard.cn
curl -I http://127.0.0.1 -H 'Host: www.cloudyard.cn'
curl -I http://127.0.0.1 -H 'Host: m.cloudyard.cn'
```

申请证书：

```bash
certbot --nginx -d www.cloudyard.cn -d m.cloudyard.cn
```

建议选择：

```text
同意协议：Y
是否分享邮箱：N
HTTP 跳转 HTTPS：Redirect
```

验证：

```bash
certbot certificates
nginx -t
systemctl reload nginx

curl -I https://www.cloudyard.cn
curl -I https://m.cloudyard.cn
```

测试续期：

```bash
certbot renew --dry-run
```

---

## 22. 恢复 / 迁移 MongoDB 数据

### 22.1 从旧服务器生成备份

旧服务器执行：

```bash
mkdir -p /opt/apps/mail-code-app/backups

DATE="$(date +%F_%H-%M-%S)"
FILE="/opt/apps/mail-code-app/backups/mail-code-$DATE.gz"

docker exec mail-code-db mongodump \
  --username mailcode \
  --password 'mailcode_change_this_password' \
  --authenticationDatabase admin \
  --db mailcode \
  --archive="/tmp/mail-code-$DATE.gz" \
  --gzip

docker cp mail-code-db:/tmp/mail-code-$DATE.gz "$FILE"
docker exec mail-code-db rm -f "/tmp/mail-code-$DATE.gz"

ls -lh "$FILE"
```

### 22.2 传到中国服务器

```bash
scp root@旧服务器公网IP:/opt/apps/mail-code-app/backups/mail-code-具体时间.gz \
  /opt/apps/mail-code-app/backups/
```

### 22.3 中国服务器恢复

恢复前会覆盖当前 `mailcode` 数据库，请确认备份文件正确。

```bash
cd /opt/apps/mail-code-app

docker compose -f docker-compose.prod.yml stop mail-code-app

docker cp /opt/apps/mail-code-app/backups/mail-code-具体时间.gz mail-code-db:/tmp/restore.gz

docker exec mail-code-db mongorestore \
  --username mailcode \
  --password 'mailcode_change_this_password' \
  --authenticationDatabase admin \
  --drop \
  --gzip \
  --archive=/tmp/restore.gz \
  --nsInclude='mailcode.*'

docker exec mail-code-db rm -f /tmp/restore.gz

docker compose -f docker-compose.prod.yml start mail-code-app
```

验证：

```bash
docker exec -it mail-code-db mongosh \
  -u mailcode \
  -p 'mailcode_change_this_password' \
  --authenticationDatabase admin \
  --eval 'use mailcode; show collections;'

docker logs --tail=100 mail-code-app
```

---

## 23. 中国服务器 MongoDB 备份脚本

本脚本只备份 MongoDB。软件文件不备份；软件信息如果在 MongoDB 中，会随数据库备份。

创建脚本：

```bash
cat > /usr/local/bin/backup-mail-code-mongo-cn.sh <<'EOF'
#!/bin/bash
set -Eeuo pipefail

APP_DIR="/opt/apps/mail-code-app"
BACKUP_DIR="$APP_DIR/backups"
DATE="$(date +%F_%H-%M-%S)"
FILE="$BACKUP_DIR/mail-code-$DATE.gz"

CONTAINER_NAME="mail-code-db"
MONGO_USER="mailcode"
MONGO_PASS="mailcode_change_this_password"
AUTH_DB="admin"
DB_NAME="mailcode"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER_NAME" mongodump \
  --username "$MONGO_USER" \
  --password "$MONGO_PASS" \
  --authenticationDatabase "$AUTH_DB" \
  --db "$DB_NAME" \
  --archive="/tmp/mail-code-$DATE.gz" \
  --gzip

docker cp "$CONTAINER_NAME:/tmp/mail-code-$DATE.gz" "$FILE"
docker exec "$CONTAINER_NAME" rm -f "/tmp/mail-code-$DATE.gz"

# 中国服务器本地只保留最近 3 个 MongoDB 备份
ls -1t "$BACKUP_DIR"/mail-code-*.gz 2>/dev/null | tail -n +4 | xargs -r rm -f

echo "$FILE"
EOF

chmod +x /usr/local/bin/backup-mail-code-mongo-cn.sh
```

测试：

```bash
/usr/local/bin/backup-mail-code-mongo-cn.sh
ls -lh /opt/apps/mail-code-app/backups
```

---

## 24. 后期更新脚本 deploy-cn.sh

用途：后期项目代码更新时，一条命令完成：

```text
备份 MongoDB → 拉取代码 → 构建 web-admin → 构建 uniapp H5 → 重建后端镜像 → reload Nginx → 检查
```

创建脚本：

```bash
cat > /opt/apps/mail-code-app/deploy-cn.sh <<'EOF'
#!/bin/bash
set -Eeuo pipefail

APP_DIR="/opt/apps/mail-code-app"
REPO_DIR="$APP_DIR/repo"
WEB_DIR="$REPO_DIR/web-admin"
UNIAPP_DIR="$REPO_DIR/uniapp"
WEB_DIST="$WEB_DIR/dist"
UNIAPP_DIST="$UNIAPP_DIR/dist/build/h5"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
ENV_FILE="$APP_DIR/.env.prod"
BRANCH="main"
NODE_IMAGE="node:20-bookworm-slim"
WEB_DOMAIN="www.cloudyard.cn"
MOBILE_DOMAIN="m.cloudyard.cn"
NPM_CACHE="$APP_DIR/.npm-cache"
GITHUB_SSH_URL="git@github.com:GooFeng100/mail-code.git"

trap 'echo "❌ 部署失败：第 $LINENO 行命令执行失败"; exit 1' ERR

mkdir -p "$NPM_CACHE"

echo "=============================="
echo "0. 基础检查"
echo "=============================="

[ -d "$APP_DIR" ] || { echo "❌ APP_DIR 不存在：$APP_DIR"; exit 1; }
[ -d "$REPO_DIR/.git" ] || { echo "❌ Git 仓库不存在：$REPO_DIR"; exit 1; }
[ -f "$COMPOSE_FILE" ] || { echo "❌ Compose 文件不存在：$COMPOSE_FILE"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "❌ env 文件不存在：$ENV_FILE"; exit 1; }
[ -d "$WEB_DIR" ] || { echo "❌ web-admin 不存在：$WEB_DIR"; exit 1; }
[ -d "$UNIAPP_DIR" ] || { echo "❌ uniapp 不存在：$UNIAPP_DIR"; exit 1; }
systemctl is-active --quiet docker || { echo "❌ Docker 未运行"; exit 1; }

echo "✅ 基础文件检查通过"

echo "=============================="
echo "1. 更新前备份 MongoDB"
echo "=============================="
if [ -x /usr/local/bin/backup-mail-code-mongo-cn.sh ]; then
  /usr/local/bin/backup-mail-code-mongo-cn.sh || true
else
  echo "⚠️ 未找到备份脚本，跳过自动备份"
fi

echo "=============================="
echo "2. GitHub SSH 检查"
echo "=============================="

SSH_OUTPUT="$(ssh -T -o BatchMode=yes -o ConnectTimeout=15 git@github.com 2>&1 || true)"
echo "$SSH_OUTPUT"
echo "$SSH_OUTPUT" | grep -Eq "successfully authenticated|does not provide shell access" || {
  echo "❌ GitHub SSH 认证或连接失败"
  exit 1
}

echo "=============================="
echo "3. 拉取代码"
echo "=============================="

cd "$REPO_DIR"

CURRENT_REMOTE="$(git remote get-url origin || true)"
if echo "$CURRENT_REMOTE" | grep -q '^https://github.com/'; then
  git remote set-url origin "$GITHUB_SSH_URL"
elif [ -z "$CURRENT_REMOTE" ]; then
  git remote add origin "$GITHUB_SSH_URL"
fi

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
git log --oneline -3

echo "=============================="
echo "4. 构建 web-admin"
echo "=============================="

cd "$WEB_DIR"
rm -rf "$WEB_DIST"

docker run --rm \
  -v "$WEB_DIR":/app \
  -v "$NPM_CACHE":/root/.npm \
  -w /app \
  "$NODE_IMAGE" \
  sh -c 'npm config set registry https://registry.npmmirror.com && if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm run build'

[ -f "$WEB_DIST/index.html" ] || { echo "❌ web-admin dist/index.html 不存在"; exit 1; }

echo "=============================="
echo "5. 构建 uniapp H5"
echo "=============================="

cd "$UNIAPP_DIR"
rm -rf "$UNIAPP_DIST"

docker run --rm \
  -v "$UNIAPP_DIR":/app \
  -v "$NPM_CACHE":/root/.npm \
  -w /app \
  "$NODE_IMAGE" \
  sh -c 'npm config set registry https://registry.npmmirror.com && if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm run build:h5'

[ -f "$UNIAPP_DIST/index.html" ] || {
  echo "❌ uniapp H5 index.html 不存在，请检查真实输出目录"
  find "$UNIAPP_DIR" -maxdepth 5 -name index.html
  exit 1
}

echo "=============================="
echo "6. 重建后端镜像并更新 app 容器"
echo "=============================="

cd "$APP_DIR"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build mail-code-app

echo "=============================="
echo "7. 检查 Nginx"
echo "=============================="

nginx -t
systemctl reload nginx

echo "=============================="
echo "8. 服务状态"
echo "=============================="

docker compose -f "$COMPOSE_FILE" ps
ss -tulnp | grep ':3002' || true

echo "=============================="
echo "9. 本机访问测试"
echo "=============================="

curl -I "http://127.0.0.1:3002" || true
curl -I "http://127.0.0.1" -H "Host: $WEB_DOMAIN" || true
curl -I "http://127.0.0.1" -H "Host: $MOBILE_DOMAIN" || true

echo "=============================="
echo "✅ 国内服务器更新完成"
echo "管理端：http(s)://$WEB_DOMAIN"
echo "移动端：http(s)://$MOBILE_DOMAIN"
echo "=============================="
EOF

chmod +x /opt/apps/mail-code-app/deploy-cn.sh
```

以后更新：

```bash
/opt/apps/mail-code-app/deploy-cn.sh
```

---

## 25. App WGT 热更新脚本

初始化目录：

```bash
mkdir -p /opt/apps/mail-code-app/app-updates

cat > /opt/apps/mail-code-app/app-updates/version.json <<'EOF'
{
  "wgtVersion": "1.0.0",
  "wgtUrl": "",
  "apkVersion": "1.0.0",
  "apkUrl": "",
  "force": false,
  "note": "当前已是最新版本"
}
EOF
```

创建脚本：

```bash
cat > /opt/apps/mail-code-app/release-wgt-cn.sh <<'EOF'
#!/bin/bash
set -Eeuo pipefail

APP_DIR="/opt/apps/mail-code-app"
REPO_DIR="$APP_DIR/repo"
UNIAPP_DIR="$REPO_DIR/uniapp"
MANIFEST="$UNIAPP_DIR/src/manifest.json"
UPDATE_DIR="$APP_DIR/app-updates"
BRANCH="main"
DOMAIN="m.cloudyard.cn"
NODE_IMAGE="node:20-bookworm-slim"
NPM_CACHE="$APP_DIR/.npm-cache"

VERSION="${1:-}"
NOTE="${2:-修复了一些问题}"

if [ -z "$VERSION" ]; then
  echo "用法：$0 1.0.1 \"修复登录问题\""
  exit 1
fi

mkdir -p "$UPDATE_DIR" "$NPM_CACHE"

cd "$REPO_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f "$MANIFEST" ]; then
  echo "❌ 未找到 manifest.json：$MANIFEST"
  exit 1
fi

APPID=$(jq -r '.appid' "$MANIFEST")
MANIFEST_VERSION=$(jq -r '.versionName' "$MANIFEST")

if [ "$MANIFEST_VERSION" != "$VERSION" ]; then
  echo "❌ 版本不一致"
  echo "传入版本：$VERSION"
  echo "manifest.json：$MANIFEST_VERSION"
  exit 1
fi

cd "$UNIAPP_DIR"
rm -rf dist/build/app dist/build/app-plus

if jq -e '.scripts["build:app-plus"]' package.json >/dev/null 2>&1; then
  BUILD_SCRIPT="build:app-plus"
elif jq -e '.scripts["build:app"]' package.json >/dev/null 2>&1; then
  BUILD_SCRIPT="build:app"
else
  echo "❌ package.json 里没有 build:app-plus 或 build:app"
  exit 1
fi

docker run --rm \
  -v "$UNIAPP_DIR":/app \
  -v "$NPM_CACHE":/root/.npm \
  -w /app \
  "$NODE_IMAGE" \
  sh -c "npm config set registry https://registry.npmmirror.com && if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm run $BUILD_SCRIPT"

if [ -d "$UNIAPP_DIR/dist/build/app-plus" ]; then
  BUILD_DIR="$UNIAPP_DIR/dist/build/app-plus"
elif [ -d "$UNIAPP_DIR/dist/build/app" ]; then
  BUILD_DIR="$UNIAPP_DIR/dist/build/app"
else
  echo "❌ 未找到 App 构建目录"
  exit 1
fi

WGT_FILE="${APPID}-${VERSION}.wgt"
WGT_PATH="$UPDATE_DIR/$WGT_FILE"
rm -f "$WGT_PATH"

cd "$BUILD_DIR"
zip -qr "$WGT_PATH" .
chmod 644 "$WGT_PATH"

VERSION_JSON="$UPDATE_DIR/version.json"
WGT_URL="https://$DOMAIN/app-updates/$WGT_FILE"

python3 - "$VERSION_JSON" "$VERSION" "$WGT_URL" "$NOTE" <<'PY'
import json, os, sys
path, version, url, note = sys.argv[1:5]
old = {}
if os.path.exists(path):
    try:
        old = json.load(open(path, 'r', encoding='utf-8'))
    except Exception:
        old = {}
data = {
    "wgtVersion": version,
    "wgtUrl": url,
    "apkVersion": old.get("apkVersion", "1.0.0"),
    "apkUrl": old.get("apkUrl", ""),
    "force": old.get("force", False),
    "note": note
}
with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')
PY

nginx -t
systemctl reload nginx

curl -I "https://$DOMAIN/app-updates/version.json" || true
curl -I "$WGT_URL" || true

echo "✅ WGT 发布完成：$WGT_URL"
EOF

chmod +x /opt/apps/mail-code-app/release-wgt-cn.sh
```

发布示例：

```bash
/opt/apps/mail-code-app/release-wgt-cn.sh 1.0.4 "修复国内服务器迁移后的登录和验证码问题"
```

脚本会同步更新服务器上的 `version.json`，不需要手动再改。

---

## 26. Gmail IMAP 检测脚本

创建临时检测脚本：

```bash
cat > /opt/apps/mail-code-app/scripts/check-gmail-imap.sh <<'EOF'
#!/bin/bash
set -u

CONTAINER="mail-code-app"

echo "============================================================"
echo " Gmail IMAP 检测"
echo " 时间: $(date '+%F %T')"
echo " 容器: $CONTAINER"
echo "============================================================"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "❌ 容器 $CONTAINER 未运行"
  exit 1
fi

echo
echo "1. 环境变量"
docker exec "$CONTAINER" sh -lc '
env | grep -E "^(MAIL_HOST|MAIL_PORT|MAIL_SECURE|MAIL_USER|MAIL_PROXY_ENABLED|MAIL_PROXY_URL|MAIL_LISTENER_ENABLED|MAIL_SCAN_WINDOW_MINUTES|MAIL_SCAN_INTERVAL_SECONDS|NODE_OPTIONS)="
'

echo
echo "2. DNS"
docker exec "$CONTAINER" sh -lc 'getent hosts imap.gmail.com || true'

echo
echo "3. TCP / TLS / IMAP 登录"
docker exec -i "$CONTAINER" node <<'NODE'
const tls = require('tls');

const host = process.env.MAIL_HOST || 'imap.gmail.com';
const port = Number(process.env.MAIL_PORT || 993);
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;

if (!user || !pass) {
  console.error('❌ MAIL_USER 或 MAIL_PASS 不存在');
  process.exit(1);
}

function quote(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

let buffer = '';
let sentLogin = false;
let finished = false;

const sock = tls.connect({ host, port, servername: host }, () => {
  console.log(`✅ TLS connected to ${host}:${port}`);
});

sock.setEncoding('utf8');

sock.setTimeout(15000, () => {
  if (!finished) {
    console.error('❌ IMAP timeout');
    sock.destroy();
    process.exit(2);
  }
});

sock.on('data', (data) => {
  buffer += data;

  for (const line of data.split(/\r?\n/)) {
    if (line.trim()) console.log(line);
  }

  if (!sentLogin && buffer.includes('* OK')) {
    sentLogin = true;
    sock.write(`a1 LOGIN ${quote(user)} ${quote(pass)}\r\n`);
  }

  if (/^a1 OK/m.test(buffer)) {
    finished = true;
    console.log('✅ IMAP login ok');
    sock.write('a2 LOGOUT\r\n');
    setTimeout(() => process.exit(0), 300);
  }

  if (/^a1 (NO|BAD)/m.test(buffer)) {
    finished = true;
    console.error('❌ IMAP login failed');
    sock.write('a2 LOGOUT\r\n');
    setTimeout(() => process.exit(3), 300);
  }
});

sock.on('error', (err) => {
  console.error('❌ IMAP error:', err.code, err.message);
  process.exit(1);
});
NODE

echo
echo "4. 最近邮件日志"
docker logs --tail=200 "$CONTAINER" 2>&1 | grep -Ei "imap|gmail|mail|listener|scan|proxy|connect|timeout|error|auth|login" || true
EOF

chmod +x /opt/apps/mail-code-app/scripts/check-gmail-imap.sh
```

使用：

```bash
/opt/apps/mail-code-app/scripts/check-gmail-imap.sh
```

---

## 27. 可选：Tailscale / SOCKS5 美国出口

当前 Gmail 可直连时不要启用本节。只有 Gmail / Adobe 访问不稳定时再启用。

### 27.1 中国服务器安装 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
systemctl enable --now tailscaled
tailscale up --hostname gfserver-shanghai
```

验证：

```bash
tailscale status
tailscale ip -4
```

UFW 放行 Tailscale SSH：

```bash
ufw allow in on tailscale0 to any port 22 proto tcp
ufw reload
```

### 27.2 美国服务器加入 Tailscale

美国服务器主机名建议固定为：

```text
vps-us
```

执行：

```bash
curl -fsSL https://tailscale.com/install.sh | sh
systemctl enable --now tailscaled
tailscale up --hostname vps-us
```

### 27.3 创建 SOCKS5 SSH 动态转发

中国服务器生成专用密钥：

```bash
ssh-keygen -t ed25519 -f /root/.ssh/mailcode_us_socks -C "mailcode-cn-to-vps-us-socks" -N ""
cat /root/.ssh/mailcode_us_socks.pub
```

将公钥加入美国服务器后测试：

```bash
ssh -i /root/.ssh/mailcode_us_socks root@vps-us "echo ok"
```

手动测试：

```bash
ssh -i /root/.ssh/mailcode_us_socks \
  -N \
  -D 127.0.0.1:1080 \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=accept-new \
  root@vps-us
```

另开窗口测试：

```bash
ss -tulnp | grep ':1080'
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

### 27.4 创建 systemd 服务

```bash
cat > /etc/systemd/system/mailcode-us-socks.service <<'EOF'
[Unit]
Description=mail-code SOCKS5 tunnel to vps-us over Tailscale
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/ssh -i /root/.ssh/mailcode_us_socks -N -D 127.0.0.1:1080 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new root@vps-us
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mailcode-us-socks.service
```

验证：

```bash
systemctl status mailcode-us-socks.service --no-pager
ss -tulnp | grep ':1080'
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

确认通过后，修改 `.env.prod`：

```env
MAIL_PROXY_ENABLED=true
MAIL_PROXY_URL=socks5://host.docker.internal:1080
```

环境变量变更后必须重建 app 容器，不是 restart：

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate mail-code-app
```

---

## 28. 可选：NAS 拉取中国服务器 MongoDB 备份

当前约定：

```text
中国服务器 Tailscale 主机名：gfserver-shanghai
NAS SSH 私钥：/home/admin/.ssh/id_ed25519
NAS 本地备份目录：/vol1/1000/backup/mail-code/mongodb
NAS 本地保留数量：最近 3 个
```

### 28.1 NAS 配置 SSH Key

NAS 上执行：

```bash
mkdir -p /home/admin/.ssh
chmod 700 /home/admin/.ssh

ssh-keygen -t ed25519 -f /home/admin/.ssh/id_ed25519 -C "nas-to-gfserver-shanghai-backup"
```

把公钥加入中国服务器：

```bash
ssh root@gfserver-shanghai "mkdir -p /root/.ssh && chmod 700 /root/.ssh"

cat /home/admin/.ssh/id_ed25519.pub \
  | ssh root@gfserver-shanghai "cat >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
```

测试：

```bash
ssh -i /home/admin/.ssh/id_ed25519 \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=accept-new \
  -o ConnectTimeout=15 \
  root@gfserver-shanghai "echo ok"
```

### 28.2 NAS 拉取脚本

```bash
mkdir -p /vol1/1000/backup/mail-code

cat > /vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh <<'EOF'
#!/bin/bash
set -euo pipefail

REMOTE_HOST="root@gfserver-shanghai"
SSH_KEY="/home/admin/.ssh/id_ed25519"
LOCAL_DIR="/vol1/1000/backup/mail-code/mongodb"

mkdir -p "$LOCAL_DIR"

SSH_OPTS=(
    -i "$SSH_KEY"
    -o IdentitiesOnly=yes
    -o StrictHostKeyChecking=accept-new
    -o ConnectTimeout=15
)

echo "正在连接中国服务器并生成 MongoDB 备份..."

REMOTE_FILE=$(ssh "${SSH_OPTS[@]}" "$REMOTE_HOST" "/usr/local/bin/backup-mail-code-mongo-cn.sh" | tail -n 1)

if [ -z "$REMOTE_FILE" ]; then
    echo "❌ 未获取到远程备份文件路径"
    exit 1
fi

echo "Remote backup: $REMOTE_FILE"

scp "${SSH_OPTS[@]}" "$REMOTE_HOST:$REMOTE_FILE" "$LOCAL_DIR/"

ls -1t "$LOCAL_DIR"/mail-code-*.gz 2>/dev/null | tail -n +4 | xargs -r rm -f

echo "✅ Backup pulled to $LOCAL_DIR"
EOF

chmod +x /vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh
```

测试：

```bash
/vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh
ls -lh /vol1/1000/backup/mail-code/mongodb
```

### 28.3 NAS 定时任务

每天早上 7 点：

```bash
crontab -u admin -e
```

添加：

```cron
0 7 * * * /vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh >> /vol1/1000/backup/mail-code/backup.log 2>&1
```

查看日志：

```bash
tail -100 /vol1/1000/backup/mail-code/backup.log
```

---

## 29. 维护命令速查

### 29.1 Docker

```bash
docker ps
docker ps -a
docker images
docker compose -f /opt/apps/mail-code-app/docker-compose.prod.yml ps
docker logs -f mail-code-app
docker logs -f mail-code-db
docker logs -f mail-code-redis
```

### 29.2 Nginx

```bash
nginx -t
systemctl status nginx --no-pager
systemctl reload nginx
tail -100 /var/log/nginx/error.log
tail -100 /var/log/nginx/access.log
```

### 29.3 端口

```bash
ss -tulnp
ss -tulnp | grep ':80'
ss -tulnp | grep ':443'
ss -tulnp | grep ':3002'
ss -tulnp | grep ':1080'
```

### 29.4 DNS / HTTP / HTTPS

```bash
dig www.cloudyard.cn +short
dig m.cloudyard.cn +short

curl -I http://127.0.0.1 -H 'Host: www.cloudyard.cn'
curl -I http://127.0.0.1 -H 'Host: m.cloudyard.cn'

curl -I http://www.cloudyard.cn
curl -I http://m.cloudyard.cn

curl -I https://www.cloudyard.cn
curl -I https://m.cloudyard.cn
```

### 29.5 Certbot

```bash
certbot certificates
certbot renew --dry-run
```

### 29.6 MongoDB

```bash
docker exec -it mail-code-db mongosh \
  -u mailcode \
  -p 'mailcode_change_this_password' \
  --authenticationDatabase admin
```

进入后：

```javascript
show dbs
use mailcode
show collections
```

---

## 30. 更新 / 重启 / 重建规则

### 30.1 只是服务卡住

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml restart mail-code-app
```

### 30.2 修改了 `.env.prod`

例如修改 Gmail 密码、代理开关、JWT、Mongo URL：

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate mail-code-app
```

注意：`restart` 不会重新读取 `.env.prod`。

### 30.3 修改了 `docker-compose.prod.yml`

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate
```

### 30.4 后端代码更新

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build mail-code-app
```

### 30.5 前端代码更新

重新构建 web-admin / uniapp H5，并 reload Nginx。建议直接执行：

```bash
/opt/apps/mail-code-app/deploy-cn.sh
```

---

## 31. 常见故障排查

### 31.1 Nginx 本地 Host 验证 200，但浏览器显示备案拦截

说明：

```text
Nginx 配置正确
域名解析正确
阿里云公网入口已识别该域名
但备案未通过
```

处理：

```text
继续备案；备案通过前不要申请 HTTPS。
```

### 31.2 Nginx 502

检查：

```bash
curl -I http://127.0.0.1:3002
docker logs --tail=200 mail-code-app
ss -tulnp | grep ':3002'
```

常见原因：

```text
1. Node 容器未启动。
2. Node 容器没有监听 3000。
3. 端口映射 127.0.0.1:3002:3000 写错。
4. .env.prod 数据库连接失败。
```

### 31.3 Certbot 失败

检查：

```bash
nginx -t
curl -I http://www.cloudyard.cn
curl -I http://m.cloudyard.cn
dig www.cloudyard.cn +short
dig m.cloudyard.cn +short
```

常见原因：

```text
1. 备案未通过，阿里云拦截 HTTP 验证。
2. 80 端口未开放。
3. Nginx 提前写了不存在的 ssl_certificate。
4. 域名未解析到中国服务器公网 IP。
5. IPv6 AAAA 记录不可用。
```

### 31.4 Gmail 拉取失败

当前不启用 SOCKS5 时：

```bash
grep -E "MAIL_PROXY" /opt/apps/mail-code-app/.env.prod
/opt/apps/mail-code-app/scripts/check-gmail-imap.sh
```

应为：

```env
MAIL_PROXY_ENABLED=false
MAIL_PROXY_URL=
```

如果 Gmail 偶发超时，优先确认是否为 IPv6 不稳定：

```bash
grep -E "NODE_OPTIONS" /opt/apps/mail-code-app/.env.prod
```

建议保留：

```env
NODE_OPTIONS=--dns-result-order=ipv4first
```

### 31.5 MongoDB 密码错误

如果 `mongodb-data` 已经初始化过，修改 compose 中的：

```yaml
MONGO_INITDB_ROOT_PASSWORD
```

不会改变已有 MongoDB 用户密码。

处理：

```text
新部署且无数据：可删除 mongodb-data 重新初始化。
已有数据：不要删除目录，应该进入 Mongo 修改用户密码或按旧密码连接。
```

---

## 32. 上线检查清单

```text
[ ] www.cloudyard.cn A 记录指向中国服务器公网 IP
[ ] m.cloudyard.cn A 记录指向中国服务器公网 IP
[ ] 889100.xyz 保留 Cloudflare Email Routing / Catch-all
[ ] 889100.xyz 不作为网站访问域名
[ ] .env.prod 中 MAIL_DOMAIN_CONFIG domain 是 889100.xyz
[ ] .env.prod 中 verificationCodeUrl 是 www.cloudyard.cn
[ ] .env.prod 中 MAIL_PROXY_ENABLED=false
[ ] Nginx server_name 是 www.cloudyard.cn 和 m.cloudyard.cn
[ ] docker-compose.prod.yml 不暴露 MongoDB / Redis
[ ] Node 只绑定 127.0.0.1:3002
[ ] HTTP 本机 Host 验证返回 200
[ ] 备案通过后再申请 HTTPS
[ ] deploy-cn.sh 不强制检查 SOCKS5
[ ] Gmail 检测脚本通过或已确认后续启用 SOCKS5
[ ] 中国服务器备份脚本只生成 MongoDB 备份
[ ] 中国服务器本地只保留最近 3 个 MongoDB 备份
[ ] NAS 拉取目录为 /vol1/1000/backup/mail-code/mongodb
[ ] NAS 本地只保留最近 3 个 MongoDB 备份
[ ] 正式服务器不要反复执行从 0 部署步骤，后续使用 deploy-cn.sh 更新
```

---

## 33. 已有服务器维护建议

如果服务器已经部署成功，不需要再重新执行第 1～21 步。日常只用：

```bash
# 更新项目
/opt/apps/mail-code-app/deploy-cn.sh

# 手动备份
/usr/local/bin/backup-mail-code-mongo-cn.sh

# Gmail 检测
/opt/apps/mail-code-app/scripts/check-gmail-imap.sh

# 查看服务
docker ps
docker logs --tail=100 mail-code-app
nginx -t
```

已有服务器上不要随意执行：

```bash
docker compose down -v
rm -rf mongodb-data
certbot --nginx ...
```

除非已经确认备份完整，并清楚操作后果。
