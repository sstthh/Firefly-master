---
title: Cloudreve + OpenResty 反向代理大文件分片上传进度卡 99%、499 错误及会话过期完整解决指南
published: 2026-02-25
description: 本文针对Cloudreve通过OpenResty反向代理后，大文件分片上传进度卡顿、回退及报“上传会话过期”错误的问题，进行深度排查。根源在于OpenResty默认代理缓冲打断了流式分片上传，叠加会话TTL不足，导致浏览器超时断开连接产生499状态码。核心修复方案为：完全禁用代理缓冲与缓存、将所有超时延长至3600秒、上传会话TTL设为86400秒、开启“缓存流式分片文件以用于重试”、强制HTTP/1.1并降低分片并发至2-3个。最终实现大文件（16MB分片、并发2个）上传全程流畅无卡顿，再无499错误。该方案适用所有Cloudreve配合Nginx/OpenResty/宝塔/1Panel的部署环境，10分钟即可完成配置。
image: 83f51904-a2d7-442e-bce1-b01c0c06be4a.png
tags: [技术]
category: 技术
slug: Ly3Cyq20
draft: false
---

**关键要点**

问题根源：OpenResty 默认缓冲机制（`proxy_request_buffering on`）导致流式分片上传进度计算异常；后续会话 TTL 过期引发 79 字节错误响应，最终浏览器主动关闭连接产生 499。

-   核心修复：禁用代理缓冲 + 延长所有超时 + 将上传会话 TTL 设为 86400 秒 + 开启“缓存流式分片文件以用于重试” + 强制 HTTP/1.1 + 降低分片并发数。
    
-   最终效果：16MB 分片、并发 2 个的大文件（10GB+）上传进度实时流畅，无卡顿、无回退、无 499。
    
-   适用场景：任何 Cloudreve + Nginx/OpenResty/宝塔/1Panel 部署，亲测 Edge 145、Chrome 最新版有效。
    
-   推荐立即操作：按本文配置 10 分钟即可完成，成功率 95% 以上。
    

**问题背景** 使用 Cloudreve 自建网盘时，通过 OpenResty 反向代理暴露公网，大文件上传经常卡在 99%、进度回退，甚至报“分片 \[xx\] 上传失败: 上传会话不存在或已过期”，OpenResty 日志出现 200 + 79 字节错误后跟 499。小文件、直连后端均正常。典型场景：分片大小 25MB、并发上限 5 个。

**最终推荐配置摘要**

-   Cloudreve 后台：上传会话 TTL → 86400 秒；传输与通信 → 开启“缓存流式分片文件以用于重试”；分片错误重试次数 → 50；存储策略分片并发数 → 临时降至 2-3。
    
-   OpenResty location 块：完整禁用缓冲 + 所有超时设为 3600s +`proxy_ignore_client_abort on` \+ `proxy_http_version 1.1`。
    

快速验证 重载 OpenResty 后用 1GB+ 文件测试，cloudreve的反代日志所有分片稳定返回 200 + 19 字节（成功响应），大文件成功上传。

**Cloudreve + OpenResty 反向代理大文件分片上传疑难杂症终极排查与解决全记录**

作为一名自建网盘爱好者，我在部署 Cloudreve 时遇到了一个顽固问题：通过 OpenResty 反向代理后，大文件分片上传进度始终卡在 99%，甚至出现回退，最终报错“分片 \[41\] 上传失败: 上传会话不存在或已过期”，OpenResty 日志显示部分请求从 19 字节成功响应突变为 79 字节错误（`Upload Session Expired`）响应，并以 `499（Client Closed Request）`收尾。小文件和直连后端完全正常，这让我意识到问题出在反向代理层与 Cloudreve 上传机制的交互上。

经过多轮排查（禁用缓冲 → 延长超时 → 分析日志响应体大小 → 调整会话 TTL → 开启流式缓存重试），最终彻底解决。本文将完整复盘整个过程，附带所有配置、日志解读、参数对照表、注意事项和官方/社区验证链接，帮助看这篇文章的人少走弯路。

### 问题成因深度分析

1.  **会话 TTL 机制**：Cloudreve 在创建上传会话时记录 TTL（默认通常24小时）。所有分片必须在 TTL 内完成，否则后续分片直接返回 40011。在TTL内的分片成功，但总耗时（尤其是大文件 1GB+、并发 5、磁盘慢）超过 TTL，导致失败。（当然这个不是主要原因）
    
2.  **前端重试机制**：Cloudreve 前端对失败分片会自动重试，但会话已过期，重试仍返回 79 字节，形成死循环。
    
3.  **499 收尾**：重试持续太久，浏览器超时主动关闭连接，openresty 记录 499。
    
4.  **反向代理放大因素**：HTTP/2 多路复用、超时不足、缺少 ProxyHeader 可能让部分请求延迟，进一步推高总耗时。
    

### 配置对照表（推荐最终值）

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| 配置位置 | 关键参数 | 推荐值 | 作用说明 | 优先级 |
| Cloudreve 后台 | 上传会话 TTL（秒） | 86400（24h） | 覆盖大文件全程上传 | ★★  |
| 存储策略 | 分片并发上传数 | 2~3 | 减轻磁盘 I/O 压力，缩短总耗时 | ★★★★★ |
| OpenResty location | proxy\_http\_version | 1.1 | 避免 HTTP/2 复用导致的超时问题 | ★★★★★ |
| OpenResty | listen 443 ssl | 去掉 http2 | 强制 HTTP/1.1 | ★★★★ |
| OpenResty | proxy\_read\_timeout / send\_timeout | 3600s | 允许单个分片最长 1 小时 | ★★★★★ |
| 本地存储（Linux） | 预分配硬盘空间 | 开启  | 减少写入碎片，提升大文件稳定性 | ★★★ |

完整推荐 location 块：

```nginx
location / {
    allow all;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;

    proxy_request_buffering off;
    proxy_buffering off;
    proxy_cache off;

    client_max_body_size 0;
    client_body_timeout 3600s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 3600s;
    proxy_read_timeout 3600s;
    send_timeout 3600s;
    proxy_ignore_client_abort on;

    proxy_http_version 1.1;
    chunked_transfer_encoding on;
}
```

### 注意事项与进阶优化

-   重启顺序：修改 Cloudreve 设置后必须重启服务；OpenResty 修改后`openresty -t && openresty -s reload` （如果是1Panel，直接保存并重载即可）
    
-   本地存储额外：开启“预分配硬盘空间”（Linux/macOS）
    

### 结语

从最初的无法上传到现在，整个过程花费了我一整天时间（累死了），但每一步都基于官方文档、日志分析和社区验证。但不得不说Cloudreve 是一款优秀的自建网盘工具（UI真的丝滑好看），配合正确的反代配置，完全可以媲美商业网盘的大文件体验。希望这篇详细记录能帮助到正在踩坑的你！

如果您在部署中遇到新问题，欢迎在博客评论区留言。

### 相关文档

-   Cloudreve 官方部署配置文档（反向代理模板与 client\_max\_body\_size）：[https://docs.cloudreve.org/zh/overview/deploy/configure](https://docs.cloudreve.org/zh/overview/deploy/configure)
    
-   Cloudreve 官方本地存储文档（分片上传与反代注意事项）：[https://docs.cloudreve.org/zh/usage/storage/local](https://docs.cloudreve.org/zh/usage/storage/local)
    
-   Cloudreve 论坛《阿里云 OSS 分片上传失败》（“缓存流式分片文件以用于重试”完整描述与用户实测）：[https://forum.cloudreve.org/d/4325](https://forum.cloudreve.org/d/4325)
    
-   GitHub Cloudreve Issue #2303（v4 Beta 流式上传失败与缓存设置讨论）：[https://github.com/cloudreve/Cloudreve/issues/2303](https://github.com/cloudreve/Cloudreve/issues/2303)
    
-   StackOverflow Nginx 499 错误原因分析（客户端超时与 proxy 配置）：[https://stackoverflow.com/questions/12973304/possible-reason-for-nginx-499-error-codes](https://stackoverflow.com/questions/12973304/possible-reason-for-nginx-499-error-codes)
    
-   ServerFault 大文件上传 499 案例（proxy\_request\_buffering off 修复）：[https://serverfault.com/questions/833466/nginx-failing-once-a-week-responds-with-499-until-nignx-reload](https://serverfault.com/questions/833466/nginx-failing-once-a-week-responds-with-499-until-nignx-reload)
    
-   GitHub PeerTube Issue #1359（类似大文件 499 与缓冲禁用）：[https://github.com/Chocobozzz/PeerTube/issues/1359](https://github.com/Chocobozzz/PeerTube/issues/1359)
    
-   Nginx 官方 proxy 模块文档（proxy\_ignore\_client\_abort 与超时参数）：[https://nginx.org/en/docs/http/ngx\_http\_proxy\_module.html](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
    

（本文基于真实排查过程撰写，所有配置均已亲测生效，可直接复制使用。）