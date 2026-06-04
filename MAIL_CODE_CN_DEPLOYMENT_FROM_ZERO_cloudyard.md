# mail-code 国内服务器部署与维护文档（cloudyard.cn 按步骤版）

更新日期：2026-05-30（Tailscale 主机名版；文件创建按步骤下放；备份策略已简化）  
适用项目：`mail-code-app`  
当前状态：主线部署不依赖 `Tailscale + SOCKS5 美国出口`；该模块移动到后面的可选步骤。  
当前域名规划：

```text
Web 管理端：www.cloudyard.cn
移动端：m.cloudyard.cn
验证码邮件域名：889100.xyz
```

当前 Tailscale 规划：

```text
中国服务器 Tailscale 主机名：gfserver-shanghai
美国服务器 Tailscale 主机名：vps-us（尚未购买，后续购买 VPS 后再配置）
SOCKS5 本机地址：127.0.0.1:1080
容器访问 SOCKS5 地址：socks5://host.docker.internal:1080
```

说明：当前部署主线先完成 Docker / Nginx / HTTP / 备案 / HTTPS / 数据迁移；Tailscale 和 SOCKS5 不在前置步骤中执行。


---

## 0.1 当前固定变量速查（不在这里创建文件）

本节只集中记录当前本机部署值，方便复制到后续对应步骤中。  
`.env.prod`、`docker-compose.prod.yml`、备份脚本、热更新脚本等文件不要在文档最前面提前创建，统一放到各自部署步骤中创建。

```bash
# 项目路径
APP_DIR="/opt/apps/mail-code-app"
REPO_DIR="/opt/apps/mail-code-app/repo"
BRANCH="main"

# 域名和服务器
CHINA_SERVER_PUBLIC_IP="139.196.15.215"
WEB_DOMAIN="www.cloudyard.cn"
MOBILE_DOMAIN="m.cloudyard.cn"
MAIL_VERIFY_DOMAIN="889100.xyz"

# Tailscale 主机名规划
TAILSCALE_CN_HOSTNAME="gfserver-shanghai"
TAILSCALE_US_HOSTNAME="vps-us"        # 美国 VPS 尚未购买，后续购买后使用这个主机名
SOCKS5_LOCAL_ADDR="127.0.0.1:1080"
DOCKER_SOCKS5_URL="socks5://host.docker.internal:1080"

# GitHub
GITHUB_SSH_REPO_URL="git@github.com:GooFeng100/mail-code.git"

# Docker / 服务名
NODE_CONTAINER_NAME="mail-code-app"
MONGO_CONTAINER_NAME="mail-code-db"
REDIS_CONTAINER_NAME="mail-code-redis"
NODE_HOST_PORT="127.0.0.1:3002"
NODE_CONTAINER_PORT="3000"

# MongoDB
MONGO_DB_NAME="mailcode"
MONGO_USER="mailcode"
MONGO_PASSWORD="mailcode_change_this_password"
MONGO_URL="mongodb://mailcode:mailcode_change_this_password@mail-code-db:27017/mailcode?authSource=admin"

# Redis
REDIS_URL="redis://mail-code-redis:6379"

# 后台管理员
DEFAULT_ADMIN_USERNAME="admin"
DEFAULT_ADMIN_PASSWORD="admin123456"

# JWT / Token
JWT_SECRET="change_this_to_a_long_random_string"
JWT_EXPIRES_IN="10m"
ADMIN_JWT_EXPIRES_IN="1h"
ADOBE_JWT_EXPIRES_IN="10m"
CODE_TTL_SECONDS="300"

# Gmail IMAP
MAIL_HOST="imap.gmail.com"
MAIL_PORT="993"
MAIL_SECURE="true"
MAIL_USER="adobesaleteam@gmail.com"
MAIL_PASS="tqhclwkgaerosgts"

# 当前阶段 SOCKS5 暂未配置，先关闭代理
MAIL_PROXY_ENABLED="false"
MAIL_PROXY_URL=""

# 邮件轮询
MAIL_LISTENER_ENABLED="true"
MAIL_SCAN_WINDOW_MINUTES="5"
MAIL_SCAN_INTERVAL_SECONDS="30"

# 邮件域名配置：domain 是收验证码邮箱域名，verificationCodeUrl 是当前访问域名
MAIL_DOMAIN_CONFIG='[{"domain":"889100.xyz","verificationCodeUrl":"www.cloudyard.cn"}]'
```

如果以后修改 MongoDB 密码，需要同时修改：

```text
/opt/apps/mail-code-app/.env.prod
/opt/apps/mail-code-app/docker-compose.prod.yml
/usr/local/bin/backup-mail-code-mongo-cn.sh
```

当前备份策略：只备份 MongoDB，软件实际文件不备份；软件信息随 MongoDB 备份。

---

## 0. 本次整理后的关键改动

这版文档基于你当前进度重新整理，重点做了以下调整：

```text
1. 新域名改为 cloudyard.cn：
   - www.cloudyard.cn → web-admin 管理端
   - m.cloudyard.cn   → uniapp 移动端

2. 老域名 889100.xyz 不再作为网站访问域名：
   - 只保留 Cloudflare Email Routing / Catch-all
   - 用于接收验证码邮件，例如 user01@889100.xyz

3. 删除当前阶段不需要的 SOCKS5 强依赖：
   - 部署前半段不再要求先配置 Tailscale / SOCKS5
   - .env.prod 默认 MAIL_PROXY_ENABLED=false
   - deploy-cn.sh 不再强制检查 mailcode-us-socks.service
   - SOCKS5 单独放到后面的“可选模块”，等你需要 Gmail/Adobe 代理时再配置

4. 删除 Cloudflare 作为新域名解析的说明：
   - cloudyard.cn 使用阿里云 DNS 解析
   - 不再写 Cloudflare 灰云/橙云相关步骤
   - HTTPS 证书使用服务器 Certbot 申请

5. 修正 DNS 记录：
   - 原文中 “A 记录：mail → CHINA_SERVER_PUBLIC_IP” 已删除
   - 正确为：
     www → 中国服务器公网 IP
     m   → 中国服务器公网 IP

6. 保留 GitHub SSH 拉取方式：
   - 国内服务器继续用 git@github.com:GooFeng100/mail-code.git
   - SSH 走 ssh.github.com:443

7. Tailscale 主机名固定：
   - 中国服务器：gfserver-shanghai
   - 美国服务器：vps-us（尚未购买）
   - SOCKS5 / Tailscale 不作为主线部署前置步骤

8. 文件创建顺序已下放：
   - `.env.prod` 只在第 9 步创建
   - `Dockerfile.cn` 只在第 10 步创建
   - `docker-compose.prod.yml` 只在第 11 步创建
   - 备份脚本、deploy 脚本、WGT 脚本分别在对应步骤创建

9. 备份策略已按当前要求简化：
   - 中国服务器只生成 MongoDB 备份，不打包 software-files
   - 中国服务器本地只保留最近 3 个 MongoDB 备份
   - NAS 使用旧本地目录 /vol1/1000/backup/mail-code/mongodb
   - NAS 只拉取 MongoDB 备份，本地只保留最近 3 个
```

---

## 1. 当前最终架构

```text
用户浏览器 / App
  ↓
阿里云 DNS
  ↓
中国服务器 Nginx 80/443
  ├─ www.cloudyard.cn
  │    ├─ /              /opt/apps/mail-code-app/repo/web-admin/dist
  │    ├─ /api           反代 Node：http://127.0.0.1:3002
  │    └─ /socket.io     反代 Node WebSocket：http://127.0.0.1:3002
  │
  └─ m.cloudyard.cn
       ├─ /              /opt/apps/mail-code-app/repo/uniapp/dist/build/h5
       ├─ /api           反代 Node：http://127.0.0.1:3002
       ├─ /socket.io     反代 Node WebSocket：http://127.0.0.1:3002
       └─ /app-updates   /opt/apps/mail-code-app/app-updates

中国服务器 Docker
  ├─ mail-code-app   Node API，只绑定 127.0.0.1:3002
  ├─ mail-code-db    MongoDB，不暴露公网端口
  └─ mail-code-redis Redis，不暴露公网端口

邮件链路
  xxx@889100.xyz
      ↓
  Cloudflare Email Routing Catch-all
      ↓
  Gmail
      ↓
  mail-code 后端 IMAP 轮询 Gmail
      ↓
  www.cloudyard.cn / m.cloudyard.cn 展示验证码
```

---

## 2. 重要原则

```text
1. 不要全局把 889100.xyz 替换成 cloudyard.cn。
2. 889100.xyz 是收验证码邮箱域名，继续保留在 MAIL_DOMAIN_CONFIG 的 domain。
3. cloudyard.cn 是网站访问域名，只用于 Nginx、HTTPS、前端访问地址、WGT 热更新地址。
4. 当前 SOCKS5 暂未配置，MAIL_PROXY_ENABLED 必须先保持 false。
5. cloudyard.cn 用阿里云 DNS 解析，不需要放到 Cloudflare。
6. 备案通过前不要申请 HTTPS。
7. Nginx 初始配置只能写 HTTP，不要提前写 ssl_certificate。
8. 不在文档最前面提前创建运行文件，所有文件都在对应步骤中生成。
9. Tailscale 中国服务器主机名固定为 gfserver-shanghai，美国服务器后续固定为 vps-us。
```

---

## 3. 全局变量

```text
项目名：mail-code-app
正式分支：main
中国服务器项目目录：/opt/apps/mail-code-app
仓库目录：/opt/apps/mail-code-app/repo

Web 管理端域名：www.cloudyard.cn
移动端域名：m.cloudyard.cn
邮件验证码域名：889100.xyz

Node 宿主机端口：127.0.0.1:3002
Node 容器端口：3000

MongoDB 数据库名：mailcode
MongoDB 用户名：mailcode
MongoDB 容器名：mail-code-db
Redis 容器名：mail-code-redis
Node 容器名：mail-code-app

GitHub SSH 仓库：git@github.com:GooFeng100/mail-code.git

Tailscale 中国服务器主机名：gfserver-shanghai
Tailscale 美国服务器主机名：vps-us（尚未购买）
SOCKS5 本机监听：127.0.0.1:1080
容器访问 SOCKS5：socks5://host.docker.internal:1080
```

当前本机已填写的固定值：

```text
CHINA_SERVER_PUBLIC_IP=139.196.15.215
MONGO_PASSWORD=mailcode_change_this_password
JWT_SECRET=change_this_to_a_long_random_string
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123456
GMAIL_USER=adobesaleteam@gmail.com
GMAIL_APP_PASSWORD=tqhclwkgaerosgts
```

如需重新生成随机密钥：

```bash
openssl rand -hex 32
```

---

## 4. 推荐部署顺序（当前版）

当前 SOCKS5 暂不配置，主线部署顺序如下。文件只在对应步骤创建，不提前写到文档顶部。

```text
基础环境阶段
第 1 步：服务器初始化
第 2 步：安装基础工具
第 3 步：配置 UFW 防火墙
第 4 步：安装 Docker
第 5 步：配置 Docker 国内镜像源
第 6 步：安装 Nginx

代码与容器阶段
第 7 步：修复 DNS，并配置 GitHub SSH
第 8 步：拉取项目仓库
第 9 步：创建运行目录和 .env.prod
第 10 步：创建 Dockerfile.cn
第 11 步：创建 docker-compose.prod.yml
第 12 步：提前拉取基础镜像
第 13 步：构建后端镜像
第 14 步：构建 web-admin
第 15 步：构建 uniapp H5
第 16 步：启动 Docker 容器

Nginx / 域名 / HTTPS 阶段
第 17 步：Nginx 配置 HTTP
第 18 步：DNS 和 HTTP 验证
第 19 步：备案通过后申请 HTTPS

数据与维护阶段
第 20 步：迁移 / 恢复 MongoDB 数据
第 21 步：中国服务器日常备份脚本
第 22 步：后期升级脚本 deploy-cn.sh
第 23 步：App WGT 热更新

可选增强阶段
第 24 步：可选配置 Tailscale / SOCKS5 美国出口
第 25 步：可选配置 NAS 通过 Tailscale 拉取 MongoDB 备份
```

说明：美国服务器 `vps-us` 尚未购买，因此第 24 步之前不要把 SOCKS5 作为部署通过条件。

---

## 5. 第 1 步：服务器初始化

推荐系统：

```text
Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS
CPU：2 核以上
内存：4GB 以上
硬盘：60GB 以上
```

阿里云安全组先放行：

```text
TCP 22     仅你的本地公网 IP 或临时开放
TCP 80     0.0.0.0/0
TCP 443    0.0.0.0/0
```

不要开放：

```text
3000 / 3001 / 3002
27017
6379
1080
```

登录服务器：

```bash
ssh root@CHINA_SERVER_PUBLIC_IP
```

设置时区：

```bash
timedatectl set-timezone Asia/Shanghai
timedatectl
date
```

---

## 6. 第 2 步：安装基础工具

```bash
apt update
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

## 7. 第 3 步：配置 UFW 防火墙

先放行当前 SSH、HTTP、HTTPS：

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

验证 SSH 监听：

```bash
ss -tulnp | grep ':22'
```

确认新 SSH 窗口能登录后再继续。

如果后续启用 Tailscale，再单独加：

```bash
ufw allow in on tailscale0 to any port 22 proto tcp
ufw reload
```

---

## 8. 第 4 步：安装 Docker

国内服务器优先使用阿里云 Docker CE apt 源。

### 8.1 清理失败残留源

```bash
rm -f /etc/apt/sources.list.d/docker.sources
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.asc
rm -f /etc/apt/keyrings/docker.gpg
rm -f /usr/share/keyrings/docker-archive-keyring.gpg

apt update
```

### 8.2 添加阿里云 Docker CE 源

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

### 8.3 安装 Docker

```bash
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

systemctl status docker --no-pager
docker version
docker compose version
```

---

## 9. 第 5 步：配置 Docker 国内镜像源

优先使用阿里云控制台提供的个人专属 Docker 镜像加速地址。没有专属地址时，可先用临时公共源测试。

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

## 10. 第 6 步：安装 Nginx

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

## 11. 第 7 步：修复 DNS，并配置 GitHub SSH

### 11.1 修复 systemd-resolved 上游 DNS

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

`/etc/resolv.conf` 里看到下面内容是正常的：

```text
nameserver 127.0.0.53
```

### 11.2 生成 GitHub SSH Key

```bash
ls -la ~/.ssh

ssh-keygen -t ed25519 -C "aliyun-mail-code"
cat ~/.ssh/id_ed25519.pub
```

把公钥添加到 GitHub：

```text
GitHub → Settings → SSH and GPG keys → New SSH key
Title：aliyun-mail-code
Key：粘贴 id_ed25519.pub 的完整内容
```

### 11.3 GitHub SSH 走 443

```bash
mkdir -p ~/.ssh

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

chmod 700 ~/.ssh
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

## 12. 第 8 步：拉取项目仓库

```bash
mkdir -p /opt/apps/mail-code-app
cd /opt/apps/mail-code-app

rm -rf repo

git clone git@github.com:GooFeng100/mail-code.git repo
```

切换正式分支：

```bash
cd /opt/apps/mail-code-app/repo
git fetch origin
git checkout -B main origin/main
git pull --ff-only origin main
```

验证 remote：

```bash
git remote -v
```

必须是：

```text
origin  git@github.com:GooFeng100/mail-code.git (fetch)
origin  git@github.com:GooFeng100/mail-code.git (push)
```

如果是 HTTPS，改成 SSH：

```bash
git remote set-url origin git@github.com:GooFeng100/mail-code.git
git remote -v
```

验证目录：

```bash
ls -la /opt/apps/mail-code-app/repo/app
ls -la /opt/apps/mail-code-app/repo/web-admin
ls -la /opt/apps/mail-code-app/repo/uniapp
```

---

## 13. 第 9 步：创建目录和 .env.prod

创建目录：

```bash
cd /opt/apps/mail-code-app
mkdir -p mongodb-data redis-data backups app-updates scripts logs .npm-cache
```

创建环境变量文件。你可以直接复制下面整段命令一次性写入：

```bash
nano /opt/apps/mail-code-app/.env.prod
```

下面内容已按当前本机值填写，可直接复制粘贴：

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

MAIL_HOST=imap.gmail.com
MAIL_PORT=993
MAIL_SECURE=true
MAIL_USER=adobesaleteam@gmail.com
MAIL_PASS=tqhclwkgaerosgts

# 当前阶段 SOCKS5 暂未配置，先关闭代理。
MAIL_PROXY_ENABLED=false
MAIL_PROXY_URL=

MAIL_LISTENER_ENABLED=true
MAIL_SCAN_WINDOW_MINUTES=5
MAIL_SCAN_INTERVAL_SECONDS=30

# domain 是收验证码邮箱域名，不要改成 cloudyard.cn。
# verificationCodeUrl 是现在浏览器访问的新域名。
MAIL_DOMAIN_CONFIG=[{"domain":"889100.xyz","verificationCodeUrl":"www.cloudyard.cn"}]
```

加权限：

```bash
chmod 600 /opt/apps/mail-code-app/.env.prod
```

验证：

```bash
grep -E "MONGO_URL|MAIL_PROXY_ENABLED|MAIL_DOMAIN_CONFIG|MAIL_LISTENER_ENABLED" /opt/apps/mail-code-app/.env.prod
```

---

## 14. 第 10 步：创建国内版 Dockerfile.cn

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

## 15. 第 11 步：创建 docker-compose.prod.yml

```bash
nano /opt/apps/mail-code-app/docker-compose.prod.yml
```

内容已写入当前 MongoDB 密码，可直接复制：

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
    image: redis:7
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

上面的 MongoDB 密码已经和 `.env.prod` 保持一致。

验证：

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml config
```

---

## 16. 第 12 步：提前拉取基础镜像

```bash
docker pull node:20-bookworm-slim
docker pull mongo:7
docker pull redis:7
```

验证：

```bash
docker images | grep -E "node|mongo|redis"
```

---

## 17. 第 13 步：构建后端镜像

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml --env-file .env.prod build mail-code-app
```

验证：

```bash
docker images | grep mail-code-app
```

---

## 18. 第 14 步：构建 web-admin 管理端

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

## 19. 第 15 步：构建 uniapp H5 移动端

确认脚本：

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

## 20. 第 16 步：启动 Docker 容器

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

如果 `mail-code-app` 不断重启：

```bash
docker logs -f mail-code-app
```

优先检查：

```text
1. .env.prod 变量名是否正确。
2. MONGO_URL 密码是否和 compose 中 Mongo 初始化密码一致。
3. mongodb-data 如果已经初始化过，修改 compose 的 MONGO_INITDB_ROOT_PASSWORD 不会改变旧密码。
4. MAIL_PROXY_ENABLED 当前应为 false。
5. 不要在 SOCKS5 未配置时强制验证 host.docker.internal:1080。
```

---

## 21. 第 17 步：Nginx 先配置 HTTP，不配置 HTTPS

这一步是你当前进度的下一步重点。第一次配置 Nginx 时，不要写：

```nginx
listen 443 ssl;
ssl_certificate ...
ssl_certificate_key ...
```

### 21.1 Web 管理端 HTTP 配置

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
    }
}
EOF
```

### 21.2 移动端 HTTP 配置

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

本机 Host 验证：

```bash
curl -I http://127.0.0.1 -H 'Host: www.cloudyard.cn'
curl -I http://127.0.0.1 -H 'Host: m.cloudyard.cn'
```

正常应返回：

```text
HTTP/1.1 200 OK
Server: nginx
```

如果返回 502，先查 Node：

```bash
curl -I http://127.0.0.1:3002 || true
docker logs --tail=200 mail-code-app
```

---

## 22. 第 18 步：DNS 和 HTTP 验证

### 22.1 阿里云 DNS 设置

cloudyard.cn 使用阿里云 DNS，不需要放到 Cloudflare。

阿里云解析中保留：

```text
主机记录    类型    记录值
www         A       CHINA_SERVER_PUBLIC_IP
m           A       CHINA_SERVER_PUBLIC_IP
```

不需要配置：

```text
mail.cloudyard.cn
```

除非你以后要单独做邮件域名或其他入口。

验证 DNS：

```bash
dig www.cloudyard.cn +short
dig m.cloudyard.cn +short

dig @223.5.5.5 www.cloudyard.cn +short
dig @223.5.5.5 m.cloudyard.cn +short
```

应返回：

```text
139.196.15.215
```

### 22.2 外网 HTTP 检查

```bash
curl -I http://www.cloudyard.cn
curl -I http://m.cloudyard.cn
curl -I http://www.cloudyard.cn/api/health || true
curl -I http://m.cloudyard.cn/app-updates/version.json || true
```

可能出现：

```text
1. HTTP/1.1 200 OK：公网 HTTP 已通。
2. 阿里云备案拦截页：解析和公网入口已通，但备案未完成，等备案通过。
3. 连接超时：检查安全组、UFW、Nginx、DNS。
```

备案未通过前，公网浏览器可能显示：

```text
域名暂时无法访问
备案状态不符合访问要求
```

这不是 Nginx 错误。只要本机 Host 验证返回 200，说明服务器配置基本正确。

---

## 23. 第 19 步：备案通过后申请 HTTPS 证书

备案未通过前不要执行 Certbot。备案通过，并且 HTTP 可访问后，再执行：

```bash
apt update
apt install -y certbot python3-certbot-nginx
```

申请两个域名：

```bash
certbot --nginx -d www.cloudyard.cn -d m.cloudyard.cn
```

提示选择：

```text
邮箱：填写你的邮箱
同意协议：Y
是否分享邮箱：N
HTTP 跳转 HTTPS：选择 Redirect
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

## 24. 第 20 步：从旧服务器迁移 MongoDB 数据

### 24.1 旧服务器生成备份

旧服务器执行：

```bash
mkdir -p /opt/apps/mail-code-app/backups

DATE="$(date +%F_%H-%M-%S)"
FILE="/opt/apps/mail-code-app/backups/mail-code-$DATE.gz"

docker exec mail-code-db mongodump \
  --username mailcode \
  --password '旧服务器Mongo密码' \
  --authenticationDatabase admin \
  --db mailcode \
  --archive="/tmp/mail-code-$DATE.gz" \
  --gzip

docker cp mail-code-db:/tmp/mail-code-$DATE.gz "$FILE"
docker exec mail-code-db rm -f "/tmp/mail-code-$DATE.gz"

ls -lh "$FILE"
```

### 24.2 传到中国服务器

如果暂时没有 Tailscale，可以先用公网 SSH：

```bash
scp root@旧服务器公网IP:/opt/apps/mail-code-app/backups/mail-code-具体时间.gz \
  /opt/apps/mail-code-app/backups/
```

或者从旧服务器推送到中国服务器：

```bash
scp /opt/apps/mail-code-app/backups/mail-code-具体时间.gz \
  root@CHINA_SERVER_PUBLIC_IP:/opt/apps/mail-code-app/backups/
```

### 24.3 中国服务器恢复

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

## 25. 第 21 步：中国服务器日常备份脚本

本脚本运行在中国服务器上，负责生成云端 MongoDB 备份文件，供服务器本地保留和 NAS 拉取。

当前约定：

```text
只备份 MongoDB 业务数据
中国服务器本地保留最近 3 个 MongoDB 备份
不再备份 software-files 软件文件目录
```

说明：

```text
常用软件的信息如果保存在 MongoDB 中，会随数据库一起备份。
软件安装包、图标等实际文件不备份。
如果迁移或重新登录后发现软件文件缺损，后续在管理端重新补齐。
```

创建中国服务器备份脚本：

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
```

设置权限：

```bash
chmod +x /usr/local/bin/backup-mail-code-mongo-cn.sh
```

当前备份策略：只备份 MongoDB，软件实际文件不备份；软件信息随 MongoDB 备份。

当前备份脚本中的 MongoDB 密码已经写为：

```text
mailcode_change_this_password
```

测试：

```bash
/usr/local/bin/backup-mail-code-mongo-cn.sh
ls -lh /opt/apps/mail-code-app/backups
```

确认只生成类似下面的 MongoDB 备份文件：

```text
mail-code-2026-05-30_03-00-00.gz
```

## 26. 第 22 步：创建国内版后期升级脚本 deploy-cn.sh

这个脚本不强制检查 SOCKS5，适合你当前阶段使用。

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
echo "1. DNS 检查"
echo "=============================="

getent hosts github.com >/dev/null 2>&1 || { echo "❌ github.com 无法解析，请先修复 DNS"; exit 1; }
getent hosts ssh.github.com >/dev/null 2>&1 || { echo "❌ ssh.github.com 无法解析，请先修复 DNS"; exit 1; }

echo "✅ DNS 正常"

echo "=============================="
echo "2. GitHub SSH 检查"
echo "=============================="

SSH_OUTPUT="$(ssh -T -o BatchMode=yes -o ConnectTimeout=15 git@github.com 2>&1 || true)"
echo "$SSH_OUTPUT"

echo "$SSH_OUTPUT" | grep -Eq "successfully authenticated|does not provide shell access" || {
  echo "❌ GitHub SSH 认证或连接失败"
  echo "请手动执行：ssh -T git@github.com"
  exit 1
}

echo "✅ GitHub SSH 可用"

echo "=============================="
echo "3. 拉取代码"
echo "=============================="

cd "$REPO_DIR"

CURRENT_REMOTE="$(git remote get-url origin || true)"
echo "当前 origin：$CURRENT_REMOTE"

if echo "$CURRENT_REMOTE" | grep -q '^https://github.com/'; then
  echo "⚠️ 当前 origin 是 HTTPS，改为 SSH：$GITHUB_SSH_URL"
  git remote set-url origin "$GITHUB_SSH_URL"
elif [ -z "$CURRENT_REMOTE" ]; then
  git remote add origin "$GITHUB_SSH_URL"
fi

git remote -v

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
git log --oneline -3

echo "=============================="
echo "4. 确保 Dockerfile.cn 存在"
echo "=============================="

if [ ! -f "$REPO_DIR/app/Dockerfile.cn" ]; then
cat > "$REPO_DIR/app/Dockerfile.cn" <<'DOCKERFILE'
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV npm_config_registry=https://registry.npmmirror.com
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --registry=https://registry.npmmirror.com; else npm install --omit=dev --registry=https://registry.npmmirror.com; fi
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
DOCKERFILE
fi

echo "=============================="
echo "5. 构建 web-admin"
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
echo "6. 构建 uniapp H5"
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
echo "7. 重建并启动容器"
echo "=============================="

cd "$APP_DIR"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "=============================="
echo "8. 检查 Nginx"
echo "=============================="

nginx -t
systemctl reload nginx

echo "=============================="
echo "9. 检查服务状态"
echo "=============================="

docker compose -f "$COMPOSE_FILE" ps
ss -tulnp | grep ':3002' || true

echo "=============================="
echo "10. 访问测试"
echo "=============================="

curl -I "http://127.0.0.1:3002" || true
curl -I "http://127.0.0.1" -H "Host: $WEB_DOMAIN" || true
curl -I "http://127.0.0.1" -H "Host: $MOBILE_DOMAIN" || true

if [ -d "/etc/letsencrypt/live/$WEB_DOMAIN" ]; then
  curl -I "https://$WEB_DOMAIN" || true
else
  curl -I "http://$WEB_DOMAIN" || true
fi

if [ -d "/etc/letsencrypt/live/$MOBILE_DOMAIN" ]; then
  curl -I "https://$MOBILE_DOMAIN" || true
else
  curl -I "http://$MOBILE_DOMAIN" || true
fi

echo "=============================="
echo "✅ 国内服务器部署完成"
echo "管理端：http(s)://$WEB_DOMAIN"
echo "移动端：http(s)://$MOBILE_DOMAIN"
echo "=============================="
EOF

chmod +x /opt/apps/mail-code-app/deploy-cn.sh
```

以后升级：

```bash
/opt/apps/mail-code-app/deploy-cn.sh
```

---

## 27. 第 23 步：App WGT 热更新发布脚本

初始化更新目录：

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
/opt/apps/mail-code-app/release-wgt-cn.sh 1.0.1 "修复国内服务器迁移后的登录和验证码问题"
```

---

## 28. 第 24 步：可选配置 Tailscale / SOCKS5 美国出口

当前主线部署不依赖 SOCKS5。等你后续购买美国 VPS 后，再执行本节。  
本节固定使用下面的 Tailscale 主机名：

```text
中国服务器：gfserver-shanghai
美国服务器：vps-us（尚未购买，购买后设置为这个 hostname）
```

目标链路：

```text
mail-code-app 容器
  ↓
host.docker.internal:1080
  ↓
中国服务器 127.0.0.1:1080 SOCKS5
  ↓
SSH -D over Tailscale
  ↓
美国服务器 vps-us
  ↓
美国公网出口访问 Gmail / Adobe 相关接口
```

### 28.1 中国服务器安装并登录 Tailscale

如果中国服务器还没有安装 Tailscale，执行：

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

确认列表中能看到本机名称：

```text
gfserver-shanghai
```

如果启用了 UFW，允许 Tailscale 网卡访问 SSH：

```bash
ufw allow in on tailscale0 to any port 22 proto tcp
ufw reload
```

### 28.2 美国服务器购买后安装 Tailscale

美国 VPS 购买后，建议主机名设置为：

```text
vps-us
```

在美国服务器执行：

```bash
curl -fsSL https://tailscale.com/install.sh | sh
systemctl enable --now tailscaled

tailscale up --hostname vps-us
```

验证：

```bash
tailscale status
tailscale ip -4
```

确认列表中能看到：

```text
vps-us
```

### 28.3 中国服务器测试连接美国服务器

如果 Tailscale 已启用 MagicDNS，可直接测试：

```bash
tailscale ping vps-us
ssh root@vps-us "echo ok"
```

如果没有启用 MagicDNS，就先在 Tailscale 控制台或美国服务器上查出 `vps-us` 的 `100.x.x.x` IP，然后使用：

```bash
tailscale ping 美国服务器Tailscale_IP
ssh root@美国服务器Tailscale_IP "echo ok"
```

建议优先开启 MagicDNS，这样后续脚本可以直接使用 `vps-us`。

### 28.4 中国服务器创建 SSH 动态转发专用密钥

在中国服务器执行：

```bash
ssh-keygen -t ed25519 -f /root/.ssh/mailcode_us_socks -C "mailcode-cn-to-vps-us-socks" -N ""
cat /root/.ssh/mailcode_us_socks.pub
```

把公钥加入美国服务器 `vps-us`：

```bash
ssh root@vps-us "mkdir -p /root/.ssh && chmod 700 /root/.ssh"
cat /root/.ssh/mailcode_us_socks.pub | ssh root@vps-us "cat >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
```

验证免密：

```bash
ssh -i /root/.ssh/mailcode_us_socks root@vps-us "echo ok"
```

如果 `vps-us` 无法解析，把命令中的 `vps-us` 替换成美国服务器 Tailscale IP。

### 28.5 手动测试 SOCKS5

中国服务器执行：

```bash
ssh -i /root/.ssh/mailcode_us_socks   -N   -D 127.0.0.1:1080   -o ServerAliveInterval=30   -o ServerAliveCountMax=3   -o ExitOnForwardFailure=yes   -o StrictHostKeyChecking=accept-new   root@vps-us
```

保持这个窗口不动，另开一个 SSH 窗口测试：

```bash
ss -tulnp | grep ':1080'
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

返回的公网 IP 应该是美国服务器 `vps-us` 的公网 IP，而不是中国服务器公网 IP。

测试完成后，按 `Ctrl+C` 关闭手动转发。

### 28.6 创建 SOCKS5 systemd 服务

确认手动测试成功后，再创建常驻服务：

```bash
cat > /etc/systemd/system/mailcode-us-socks.service <<'EOF'
[Unit]
Description=mail-code SOCKS5 tunnel to vps-us over Tailscale
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/ssh -i /root/.ssh/mailcode_us_socks   -N   -D 127.0.0.1:1080   -o ServerAliveInterval=30   -o ServerAliveCountMax=3   -o ExitOnForwardFailure=yes   -o StrictHostKeyChecking=accept-new   root@vps-us
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

启动：

```bash
systemctl daemon-reload
systemctl enable --now mailcode-us-socks.service
```

验证：

```bash
systemctl status mailcode-us-socks.service --no-pager
ss -tulnp | grep ':1080'
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
```

如果服务无法连接 `vps-us`，先检查：

```bash
tailscale status
tailscale ping vps-us
ssh -i /root/.ssh/mailcode_us_socks root@vps-us "echo ok"
journalctl -u mailcode-us-socks.service -n 100 --no-pager
```

### 28.7 开启项目代理

只有在 SOCKS5 服务验证成功后，才修改 `.env.prod`：

```bash
nano /opt/apps/mail-code-app/.env.prod
```

将：

```env
MAIL_PROXY_ENABLED=false
MAIL_PROXY_URL=
```

改为：

```env
MAIL_PROXY_ENABLED=true
MAIL_PROXY_URL=socks5://host.docker.internal:1080
```

重启后端：

```bash
cd /opt/apps/mail-code-app
docker compose -f docker-compose.prod.yml restart mail-code-app
docker logs -f mail-code-app
```

验证容器能连宿主机 SOCKS5：

```bash
docker exec mail-code-app node -e "const net=require('net');const s=net.connect(1080,'host.docker.internal',()=>{console.log('socks tcp ok');s.end();});s.on('error',e=>{console.error(e.message);process.exit(1)});setTimeout(()=>process.exit(2),3000);"
```

看到：

```text
socks tcp ok
```

说明容器到宿主机 SOCKS5 通道正常。



## 29. 第 25 步：可选配置 NAS 拉取中国服务器 MongoDB 备份

如果暂时没有 Tailscale，可以先跳过本节。等 Tailscale 打通后，优先用中国服务器 Tailscale 主机名 `gfserver-shanghai` 拉取备份。

当前约定：

```text
中国服务器 Tailscale 主机名：gfserver-shanghai
NAS SSH 私钥：/home/admin/.ssh/id_ed25519
NAS 本地备份目录：/vol1/1000/backup/mail-code/mongodb
NAS 本地保留数量：最近 3 个
```

说明：

```text
NAS 只拉取 MongoDB 备份。
不拉取 software-files 软件文件目录。
软件信息如果保存在 MongoDB 中，会随数据库备份。
软件文件如有缺损，后续在管理端补齐。
```

### 29.1 NAS 先设置 SSH Key 免密连接

在 NAS 上执行：

```bash
mkdir -p /home/admin/.ssh
chmod 700 /home/admin/.ssh
```

如果还没有 SSH Key，生成一个：

```bash
ssh-keygen -t ed25519 -f /home/admin/.ssh/id_ed25519 -C "nas-to-gfserver-shanghai-backup"
```

一路回车即可。

查看 NAS 公钥：

```bash
cat /home/admin/.ssh/id_ed25519.pub
```

把这一整行公钥添加到中国服务器：

```bash
ssh root@gfserver-shanghai "mkdir -p /root/.ssh && chmod 700 /root/.ssh"

cat /home/admin/.ssh/id_ed25519.pub \
  | ssh root@gfserver-shanghai "cat >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
```

测试 NAS 免密连接中国服务器：

```bash
ssh -i /home/admin/.ssh/id_ed25519 \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=accept-new \
  -o ConnectTimeout=15 \
  root@gfserver-shanghai "echo ok"
```

看到：

```text
ok
```

说明 SSH Key 连接正常。

如果 NAS 无法解析 `gfserver-shanghai`，请先在 Tailscale 控制台开启 MagicDNS；或者临时改用中国服务器的 `100.x.x.x` Tailscale IP。

### 29.2 创建 NAS 拉取脚本

在 NAS 上创建脚本：

```bash
mkdir -p /vol1/1000/backup/mail-code
nano /vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh
```

写入：

```bash
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

# 1. 让中国服务器生成最新 MongoDB 备份，并返回文件路径
REMOTE_FILE=$(ssh "${SSH_OPTS[@]}" "$REMOTE_HOST" "/usr/local/bin/backup-mail-code-mongo-cn.sh" | tail -n 1)

if [ -z "$REMOTE_FILE" ]; then
    echo "❌ 未获取到远程备份文件路径"
    exit 1
fi

echo "Remote backup: $REMOTE_FILE"

# 2. 拉取到 NAS
scp "${SSH_OPTS[@]}" "$REMOTE_HOST:$REMOTE_FILE" "$LOCAL_DIR/"

# 3. NAS 本地保留最近 3 个备份
ls -1t "$LOCAL_DIR"/mail-code-*.gz 2>/dev/null | tail -n +4 | xargs -r rm -f

echo "✅ Backup pulled to $LOCAL_DIR"
```

授权：

```bash
chmod +x /vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh
```

测试：

```bash
/vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh
ls -lh /vol1/1000/backup/mail-code/mongodb
```

### 29.3 设置 NAS 定时任务

编辑 NAS 定时任务：

```bash
crontab -e
```

每天凌晨 3 点拉取一次：

```cron
0 3 * * * /vol1/1000/backup/mail-code/pull-cn-mongo-backup.sh >> /vol1/1000/backup/mail-code/backup.log 2>&1
```

查看日志：

```bash
tail -100 /vol1/1000/backup/mail-code/backup.log
```

注意：

```text
如果旧服务器的 NAS 拉取任务仍在使用同一个本地目录 /vol1/1000/backup/mail-code/mongodb，
新旧服务器备份文件会混在一起。
建议中国服务器备份连续测试成功后，停掉旧服务器的 NAS 拉取定时任务。
```

## 30. 常用检查命令

### Docker

```bash
docker ps
docker ps -a
docker images
docker compose -f /opt/apps/mail-code-app/docker-compose.prod.yml ps
docker compose -f /opt/apps/mail-code-app/docker-compose.prod.yml logs -f mail-code-app
docker logs -f mail-code-app
docker logs -f mail-code-db
docker logs -f mail-code-redis
```

### Nginx

```bash
nginx -t
systemctl status nginx --no-pager
systemctl reload nginx
tail -100 /var/log/nginx/error.log
tail -100 /var/log/nginx/access.log
```

### 端口

```bash
ss -tulnp
ss -tulnp | grep ':80'
ss -tulnp | grep ':443'
ss -tulnp | grep ':3002'
ss -tulnp | grep ':1080'
```

### DNS / HTTP / HTTPS

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

### Certbot

```bash
certbot certificates
certbot renew --dry-run
```

### MongoDB

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

先确认：

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

当前阶段 SOCKS5 未配置时，先确认：

```bash
grep -E "MAIL_PROXY" /opt/apps/mail-code-app/.env.prod
```

应为：

```env
MAIL_PROXY_ENABLED=false
MAIL_PROXY_URL=
```

如果后续开启 SOCKS5，再检查：

```bash
systemctl status mailcode-us-socks.service --no-pager
curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org
docker exec mail-code-app node -e "const net=require('net');const s=net.connect(1080,'host.docker.internal',()=>{console.log('socks tcp ok');s.end();});s.on('error',e=>{console.error(e.message);process.exit(1)});setTimeout(()=>process.exit(2),3000);"
```

### 31.5 Mongo 密码错误

如果 `mongodb-data` 已经初始化过，修改 compose 里的：

```yaml
MONGO_INITDB_ROOT_PASSWORD
```

不会改变已有 MongoDB 用户密码。

解决方式：

```text
1. 如果是新部署且无数据，可以删除 mongodb-data 后重建。
2. 如果已有数据，不要删除目录，应该进入 Mongo 修改用户密码或按旧密码连接。
```

---

## 32. 最终检查清单

上线前确认：

```text
[ ] www.cloudyard.cn A 记录指向中国服务器公网 IP
[ ] m.cloudyard.cn A 记录指向中国服务器公网 IP
[ ] 889100.xyz 保留 Cloudflare Email Routing / Catch-all
[ ] 889100.xyz 不再作为网站访问域名
[ ] .env.prod 中 MAIL_DOMAIN_CONFIG domain 仍是 889100.xyz
[ ] .env.prod 中 verificationCodeUrl 是 www.cloudyard.cn
[ ] Nginx server_name 是 www.cloudyard.cn 和 m.cloudyard.cn
[ ] docker-compose.prod.yml 不暴露 MongoDB / Redis
[ ] Node 只绑定 127.0.0.1:3002
[ ] HTTP 本地 Host 验证返回 200
[ ] 备案通过后再申请 HTTPS
[ ] deploy-cn.sh 不再强制检查 SOCKS5
[ ] SOCKS5 暂未配置时 MAIL_PROXY_ENABLED=false
[ ] Tailscale 中国服务器主机名为 gfserver-shanghai
[ ] 美国 VPS 购买后 Tailscale 主机名为 vps-us
[ ] 文件创建顺序正确：.env / Dockerfile / compose / 脚本都在对应步骤创建
[ ] 中国服务器备份脚本只生成 MongoDB 备份，不打包 software-files
[ ] 中国服务器备份脚本本地只保留最近 3 个 MongoDB 备份
[ ] NAS 拉取脚本使用 /vol1/1000/backup/mail-code/mongodb
[ ] NAS 拉取脚本只保留最近 3 个 MongoDB 备份
```
