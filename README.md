Mail-Code 验证码接收系统 项目说明书
1. 项目基本信息
项目名称：Mail-Code 验证码接收系统
项目目录：/vol1/1000/docker/mail-code
部署设备：飞牛 NAS
设备名称：ZXHome
NAS IP：192.168.10.3
旁路由网关：192.168.10.2
主路由网关：192.168.10.1
域名：889100.xyz
部署方式：Docker Compose
2. 项目用途

本项目用于接收指定域名邮箱验证码邮件，并将验证码实时推送到网页前端。

流程：

用户打开网页
↓
输入登录账号和密码
↓
系统根据账号查询对应邮箱地址
↓
等待验证码邮件
↓
Cloudflare Catch-All 接收任意 xxx@889100.xyz 邮件
↓
转发到 Gmail
↓
Node 服务通过 IMAP 读取 Gmail
↓
解析验证码
↓
根据邮箱地址映射到登录账号
↓
通过 WebSocket 推送到前端
↓
验证码保存 10 分钟后自动过期
3. 当前域名与邮箱配置
3.1 Cloudflare Email Routing
域名：889100.xyz
功能：Catch-All 转发
状态：已启用
目标邮箱：adobesaleteam@gmail.com

Catch-All 效果：

任意用户名@889100.xyz → adobesaleteam@gmail.com

示例：

user01@889100.xyz → adobesaleteam@gmail.com
user02@889100.xyz → adobesaleteam@gmail.com
test999@889100.xyz → adobesaleteam@gmail.com
4. Gmail IMAP 配置
Gmail 邮箱：adobesaleteam@gmail.com
IMAP 服务地址：imap.gmail.com
IMAP 端口：993
加密方式：SSL / TLS
认证方式：Gmail 应用专用密码

注意：

MAIL_PASS 使用 Gmail 16 位应用专用密码
不是 Gmail 登录密码
5. 网络配置
5.1 NAS 网络
NAS IP：192.168.10.3
默认网关：192.168.10.2
DNS：192.168.10.2

说明：

因为 Gmail / Google 服务访问受网络限制，
NAS 默认网关需要指向旁路由 192.168.10.2。
5.2 网络测试命令
ping imap.gmail.com
nc -vz imap.gmail.com 993

成功示例：

Connection to imap.gmail.com 993 port [tcp/imaps] succeeded

查看默认路由：

ip route

期望看到：

default via 192.168.10.2
6. Docker 容器规划
容器名	镜像	用途	宿主机端口	容器端口
mail-code-app	node:20-alpine	Node 后端、前端页面、IMAP 监听、WebSocket	3001	3000
mail-code-redis	redis:7-alpine	验证码缓存，10 分钟过期	不暴露	6379
mail-code-db	mongo:7	保存账号、密码、邮箱映射	27018	27017
7. 项目目录结构
/vol1/1000/docker/mail-code
├── docker-compose.yml
├── app
│   ├── package.json
│   ├── .env
│   ├── README.md
│   └── src
│       ├── app.js
│       ├── config.js
│       ├── db
│       ├── mail
│       ├── routes
│       ├── services
│       ├── socket
│       └── public
├── redis-data
└── mongodb-data
8. docker-compose.yml 位置
/vol1/1000/docker/mail-code/docker-compose.yml

启动命令：

cd /vol1/1000/docker/mail-code
docker compose up -d

停止命令：

cd /vol1/1000/docker/mail-code
docker compose down

查看日志：

docker logs -f mail-code-app

查看所有容器：

docker ps
9. 环境变量文件

文件位置：

/vol1/1000/docker/mail-code/app/.env

模板：

PORT=3000

MAIL_HOST=imap.gmail.com
MAIL_PORT=993
MAIL_SECURE=true
MAIL_USER=adobesaleteam@gmail.com
MAIL_PASS=Gmail应用专用密码
MAIL_DOMAINS=889100.xyz
VERIFICATION_CODE_URL=mail.889100.xyz

REDIS_URL=redis://mail-code-redis:6379

MONGO_URL=mongodb://mailcode:数据库密码@mail-code-db:27017/mailcode?authSource=admin

JWT_SECRET=请填写随机长字符串
CODE_TTL_SECONDS=600
10. 账号与邮箱映射规则
10.1 登录账号和接收邮箱可以不同

示例：

登录账号	接收邮箱
abc	user01@889100.xyz

efg	user02@889100.xyz

说明：

abc 登录后，只能看到 user01@889100.xyz 收到的验证码。
efg 登录后，只能看到 user02@889100.xyz 收到的验证码。
11. 数据库存储内容

MongoDB 用于保存长期数据：

用户账号
密码哈希
账号启用状态
账号对应邮箱
创建时间
更新时间

Redis 用于保存临时数据：

验证码
验证码接收时间
10 分钟自动过期
12. 端口占用记录

当前 NAS 已有服务：

服务	容器名	端口
Nginx	nginx	8080
Stock App	stock-app	3000
Stock DB	stock-db	27017

本项目新增：

服务	容器名	端口
Mail Code Web	mail-code-app	3001
Mail Code MongoDB	mail-code-db	27018
Redis	mail-code-redis	不暴露

访问地址：

http://192.168.10.3:3001
13. 备份说明

需要备份的目录：

/vol1/1000/docker/mail-code/docker-compose.yml
/vol1/1000/docker/mail-code/app
/vol1/1000/docker/mail-code/mongodb-data
/vol1/1000/docker/mail-code/redis-data

重点备份：

app/.env
mongodb-data
docker-compose.yml

注意：

.env 里包含 Gmail 应用专用密码和数据库密码，不要公开。
14. 常用维护命令

进入项目目录：

cd /vol1/1000/docker/mail-code

启动：

docker compose up -d

重启 Node 服务：

docker restart mail-code-app

查看 Node 日志：

docker logs -f mail-code-app

查看 Redis 状态：

docker logs -f mail-code-redis

查看 MongoDB 状态：

docker logs -f mail-code-db

进入 Node 容器：

docker exec -it mail-code-app sh

进入 MongoDB 容器：

docker exec -it mail-code-db mongosh

进入 Redis 容器：

docker exec -it mail-code-redis sh
15. 故障排查
15.1 Gmail 收不到邮件

检查：

Cloudflare Catch-All 是否开启
目标邮箱是否是 adobesaleteam@gmail.com
Gmail 垃圾邮件是否收到
Cloudflare 活动日志是否有记录
15.2 Node 无法连接 Gmail IMAP

检查 NAS 网络：

ping imap.gmail.com
nc -vz imap.gmail.com 993

检查 .env：

MAIL_USER 是否正确
MAIL_PASS 是否为 16 位应用专用密码
MAIL_HOST 是否为 imap.gmail.com
MAIL_PORT 是否为 993
15.3 前端收不到验证码

检查：

用户是否登录成功
登录账号是否绑定了正确邮箱
邮件是否真的到达 Gmail
后端是否解析到验证码
WebSocket 是否连接成功
Redis 是否存入验证码
15.4 MongoDB 无法连接

检查：

mail-code-db 是否运行
MONGO_URL 密码是否正确
容器名称是否是 mail-code-db
数据库端口是否写成容器内部端口 27017
16. 安全注意事项
不要把 .env 文件发给别人
不要公开 Gmail 应用专用密码
不要公开 JWT_SECRET
MongoDB 不建议暴露到公网
Redis 不要暴露到公网
后台账号密码需要使用哈希保存
17. 项目变更记录
日期	变更内容	操作人
2026-04-24	创建项目目录 /vol1/1000/docker/mail-code	admin
2026-04-24	配置 Cloudflare Catch-All 到 Gmail	admin
2026-04-24	创建 Gmail 应用专用密码	admin
2026-04-24	规划 Docker 容器：Node + Redis + MongoDB	admin
18. 后续计划
1. 创建 docker-compose.yml
2. 创建 Node 项目代码
3. 测试 Gmail IMAP
4. 测试验证码解析
5. 创建登录账号和邮箱映射
6. 测试 WebSocket 实时推送
7. 接入 Nginx 反向代理

19. 公网 VPS 部署说明

本节用于以后在公网 VPS 上从 GitHub 拉取项目并部署启动。

推荐部署目录：

/opt/mail-code

GitHub 仓库地址：

git@github.com:GooFeng100/mail-code.git

HTTPS 地址：

https://github.com/GooFeng100/mail-code.git

19.1 服务器准备

VPS 需要安装：

Docker
Docker Compose
Git

Ubuntu / Debian 示例：

sudo apt update
sudo apt install -y git ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

检查版本：

docker --version
docker compose version
git --version

19.2 拉取项目

如果 VPS 已配置 GitHub SSH Key：

sudo mkdir -p /opt
cd /opt
sudo git clone git@github.com:GooFeng100/mail-code.git
sudo chown -R $USER:$USER /opt/mail-code
cd /opt/mail-code

如果没有配置 SSH Key，也可以使用 HTTPS：

sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/GooFeng100/mail-code.git
sudo chown -R $USER:$USER /opt/mail-code
cd /opt/mail-code

19.3 配置环境变量

.env 不会提交到 GitHub，需要在 VPS 上手动创建：

cp app/.env.example app/.env
nano app/.env

至少需要确认这些值：

PORT=3000
MAIL_HOST=imap.gmail.com
MAIL_PORT=993
MAIL_SECURE=true
MAIL_USER=adobesaleteam@gmail.com
MAIL_PASS=Gmail应用专用密码
MAIL_DOMAINS=889100.xyz
VERIFICATION_CODE_URL=mail.889100.xyz
REDIS_URL=redis://mail-code-redis:6379
MONGO_URL=mongodb://mailcode:数据库密码@mail-code-db:27017/mailcode?authSource=admin
JWT_SECRET=请填写随机长字符串
CODE_TTL_SECONDS=600

注意：

MAIL_PASS 必须使用 Gmail 应用专用密码，不是 Gmail 登录密码。
JWT_SECRET 建议使用随机长字符串。
MongoDB 密码需要和 docker-compose.yml 中的 MONGO_INITDB_ROOT_PASSWORD 保持一致。

生成 JWT_SECRET 示例：

openssl rand -hex 32

19.4 修改 docker-compose.yml 路径

当前 docker-compose.yml 默认使用 NAS 路径：

/vol1/1000/docker/mail-code

如果 VPS 使用推荐目录 /opt/mail-code，需要把 docker-compose.yml 中这些路径替换为：

/opt/mail-code/app:/app
/opt/mail-code/app/.env
/opt/mail-code/redis-data:/data
/opt/mail-code/mongodb-data:/data/db

可以手动编辑：

nano docker-compose.yml

也可以用命令替换：

sed -i 's#/vol1/1000/docker/mail-code#/opt/mail-code#g' docker-compose.yml

确认修改：

grep -n "/opt/mail-code" docker-compose.yml

19.5 创建数据目录

mkdir -p redis-data mongodb-data

19.6 启动服务

cd /opt/mail-code
docker compose up -d

查看容器：

docker ps

查看日志：

docker logs -f mail-code-app
docker logs -f mail-code-db
docker logs -f mail-code-redis

访问地址：

http://VPS公网IP:3001

如果 VPS 防火墙开启，需要放行 3001 端口：

sudo ufw allow 3001/tcp
sudo ufw status

19.7 使用 Nginx 反向代理

公网环境建议使用 Nginx + HTTPS，不建议直接长期暴露 3001 端口。

Nginx 示例：

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

配置 HTTPS 可以使用 certbot：

sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

19.8 更新部署

以后代码更新后，在 VPS 上执行：

cd /opt/mail-code
git pull
docker compose up -d --build
docker logs -f mail-code-app

如果只改了环境变量：

cd /opt/mail-code
nano app/.env
docker compose up -d

19.9 停止和重启

停止：

cd /opt/mail-code
docker compose down

重启：

cd /opt/mail-code
docker compose restart

只重启 Node 服务：

docker restart mail-code-app

19.10 备份和迁移

公网 VPS 上重点备份：

/opt/mail-code/app/.env
/opt/mail-code/mongodb-data
/opt/mail-code/redis-data
/opt/mail-code/docker-compose.yml

打包备份示例：

cd /opt
tar -czf mail-code-backup-$(date +%F).tar.gz mail-code/app/.env mail-code/mongodb-data mail-code/redis-data mail-code/docker-compose.yml

恢复时先停止容器，再覆盖数据目录：

cd /opt/mail-code
docker compose down

19.11 常见问题

拉取代码失败：

检查 VPS 是否能访问 GitHub。
如果 SSH 失败，先用 HTTPS clone。
如果使用 SSH，确认公钥已经添加到 GitHub 账号。

容器启动后访问不了：

检查 docker ps 是否有 mail-code-app。
检查 VPS 安全组和系统防火墙是否放行 3001。
检查 docker logs -f mail-code-app 是否报错。

Gmail IMAP 连接失败：

检查 MAIL_USER 和 MAIL_PASS。
确认 Gmail 已开启 IMAP。
确认 VPS 能访问 imap.gmail.com:993。

MongoDB 认证失败：

检查 app/.env 中 MONGO_URL 的密码。
检查 docker-compose.yml 中 MONGO_INITDB_ROOT_PASSWORD。
首次启动后如果改了 MongoDB root 密码，需要清空或迁移 mongodb-data 后重新初始化。
