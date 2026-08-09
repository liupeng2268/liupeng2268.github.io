---
title: Oracle 归档日志清理实战
date: 2026-08-09
tags: [Oracle, 数据库运维]
slug: oracle-archivelog-cleanup
---

## 背景

Oracle 开启归档模式后，归档日志（archived redo log）会持续增长。若不及时清理，FRA（Fast Recovery Area）空间占满会导致数据库挂起，是生产事故常见诱因之一。

## 排查步骤

先确认归档路径与 FRA 占用：

```sql
-- 查看归档日志存放位置
SELECT dest_id, status, destination
FROM v$archive_dest
WHERE target = 'PRIMARY';

-- 查看 FRA 使用情况（已用 / 容量）
SELECT * FROM v$recovery_area_usage;
```

## 解决方案

优先用 RMAN 删除已备份或过期归档，不要直接 rm 操作系统文件（会导致控制文件记录不一致）：

```bash
# 连接目标库
rman target /

# 删除 7 天前的归档（要求已备份）
DELETE NOPROMPT ARCHIVELOG ALL COMPLETED BEFORE 'SYSDATE-7';

# 仅删除已成功备份的归档
DELETE NOPROMPT ARCHIVELOG ALL BACKED UP 1 TIMES TO DEVICE TYPE DISK;
```

## 风险提示

- 直接操作系统层删除归档文件会使 RMAN 目录与实际不一致，需用 CROSSCHECK 修复。
- 清理前确认备份完整，避免误删可恢复点。
- 建议配置备份策略后自动清理，而非依赖人工临时操作。
