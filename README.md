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
MAIL_DOMAIN=889100.xyz

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