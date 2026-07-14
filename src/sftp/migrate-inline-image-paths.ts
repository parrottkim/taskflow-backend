import 'reflect-metadata';
import Client from 'ssh2-sftp-client';
import { readFileSync } from 'fs';
import { join, posix } from 'path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

type ResourceType = 'issue' | 'report' | 'document';

type ResourceRow = {
  id: number;
  content: string;
};

type PlannedMove = {
  oldPath: string;
  newPath: string;
  oldUrl: string;
  newUrl: string;
};

type ResourcePlan = {
  type: ResourceType;
  table: string;
  id: number;
  oldContent: string;
  newContent: string;
  moves: PlannedMove[];
};

const resourceConfigs: Record<ResourceType, { table: string }> = {
  issue: { table: 'issue' },
  report: { table: 'report' },
  document: { table: 'document' },
};

function hasArg(name: string) {
  return process.argv.includes(name);
}

function getArgValue(name: string) {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));

  return arg?.slice(prefix.length);
}

function getTypes() {
  const rawTypes = getArgValue('--types');
  if (!rawTypes) return Object.keys(resourceConfigs) as ResourceType[];

  const types = rawTypes.split(',').map((type) => type.trim());
  const invalid = types.find((type) => !(type in resourceConfigs));

  if (invalid) {
    throw new Error(`Invalid resource type: ${invalid}`);
  }

  return types as ResourceType[];
}

function normalizeBasePath(value: string) {
  return value.trim().replace(/\/+$/g, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createDataSource() {
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    namingStrategy: new SnakeNamingStrategy(),
  });
}

async function fetchRows(
  dataSource: DataSource,
  type: ResourceType,
  limit?: number,
) {
  const { table } = resourceConfigs[type];
  const rows = await dataSource.query(
    `
      SELECT id, content
      FROM "${table}"
      WHERE deleted_at IS NULL
      ORDER BY id ASC
      ${limit ? `LIMIT ${limit}` : ''}
    `,
  );

  return rows as ResourceRow[];
}

function createPlan(
  type: ResourceType,
  row: ResourceRow,
  basePath: string,
): ResourcePlan | null {
  const table = resourceConfigs[type].table;
  const inlinePathPrefix = `${basePath}/inline-images/`;
  const urlPattern = new RegExp(
    `https?://[^\\s)'"<>]*${escapeRegExp(inlinePathPrefix)}[^\\s)'"<>]+`,
    'g',
  );
  const urls = [...new Set(row.content.match(urlPattern) ?? [])];

  if (!urls.length) return null;

  const moves: PlannedMove[] = [];
  let newContent = row.content;

  for (const oldUrl of urls) {
    const pathStart = oldUrl.indexOf(inlinePathPrefix);
    if (pathStart < 0) continue;

    const urlBase = oldUrl.slice(0, pathStart);
    const oldPath = oldUrl.slice(pathStart);
    const relativePath = oldPath.slice(inlinePathPrefix.length);
    const parts = relativePath.split('/').filter(Boolean);

    // 기존 경로: {namespace}/{userId}/{YYYY}/{MM}/{filename}
    if (parts.length !== 5) continue;

    const [namespace, ownerId, year, month, filename] = parts;
    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) continue;
    if (namespace === type && ownerId === String(row.id)) continue;

    const newPath = `${inlinePathPrefix}${type}/${row.id}/${year}/${month}/${filename}`;
    const newUrl = `${urlBase}${newPath}`;

    moves.push({ oldPath, newPath, oldUrl, newUrl });
    newContent = newContent.split(oldUrl).join(newUrl);
  }

  if (!moves.length) return null;

  return {
    type,
    table,
    id: row.id,
    oldContent: row.content,
    newContent,
    moves,
  };
}

async function connectSftp() {
  const sftp = new Client();
  const privateKeyPath = process.env.SFTP_PRIVATE_KEY_PATH;

  if (!privateKeyPath) {
    throw new Error('SFTP_PRIVATE_KEY_PATH is required');
  }

  const privateKey = readFileSync(join(process.cwd(), privateKeyPath), 'utf-8');

  await sftp.connect({
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT ?? '22', 10),
    username: process.env.SFTP_USERNAME,
    privateKey,
    passphrase: process.env.SFTP_PASSPHRASE,
    readyTimeout: 10000,
    keepaliveInterval: 10000,
  });

  return sftp;
}

async function applyPlan(
  dataSource: DataSource,
  sftp: Client,
  plan: ResourcePlan,
) {
  const states: Array<{
    move: PlannedMove;
    oldExists: boolean;
    newExists: boolean;
  }> = [];
  for (const move of plan.moves) {
    states.push({
      move,
      oldExists: Boolean(await sftp.exists(move.oldPath)),
      newExists: Boolean(await sftp.exists(move.newPath)),
    });
  }

  const unavailable = states.find(
    ({ oldExists, newExists }) => oldExists === newExists,
  );
  if (unavailable) {
    const status = unavailable.oldExists ? 'conflict' : 'missing';
    console.warn(
      `[${status}] ${plan.type}#${plan.id}: ${unavailable.move.oldPath}`,
    );
    return false;
  }

  const moved: PlannedMove[] = [];

  try {
    for (const { move, oldExists } of states) {
      // old 없음 + new 있음은 이전 실행에서 파일 이동 후 DB 갱신만 실패한 경우다.
      if (!oldExists) continue;

      await sftp.mkdir(posix.dirname(move.newPath), true);
      await sftp.rename(move.oldPath, move.newPath);
      moved.push(move);
    }

    const updated = await dataSource.query(
      `UPDATE "${plan.table}"
       SET content = $1
       WHERE id = $2 AND content = $3
       RETURNING id`,
      [plan.newContent, plan.id, plan.oldContent],
    );
    const [rows, affected] = updated as [Array<{ id: number }>, number];
    if (affected !== 1 || rows.length !== 1) {
      throw new Error(
        `Content changed while migrating ${plan.type}#${plan.id}`,
      );
    }

    return true;
  } catch (err) {
    for (const move of moved.reverse()) {
      try {
        await sftp.mkdir(posix.dirname(move.oldPath), true);
        await sftp.rename(move.newPath, move.oldPath);
      } catch (rollbackErr) {
        console.error(
          `[rollback_failed] ${plan.type}#${plan.id}: ${move.newPath}`,
          rollbackErr,
        );
      }
    }

    throw err;
  }
}

function findSharedPaths(plans: ResourcePlan[]) {
  const owners = new Map<string, Set<string>>();

  for (const plan of plans) {
    for (const move of plan.moves) {
      const resource = `${plan.type}#${plan.id}`;
      const resources = owners.get(move.oldPath) ?? new Set<string>();
      resources.add(resource);
      owners.set(move.oldPath, resources);
    }
  }

  return new Set(
    [...owners.entries()]
      .filter(([, resources]) => resources.size > 1)
      .map(([path]) => path),
  );
}

async function main() {
  const write = hasArg('--write');
  const limitValue = getArgValue('--limit');
  const limit = limitValue ? parseInt(limitValue, 10) : undefined;
  const types = getTypes();
  const basePath = normalizeBasePath(process.env.SFTP_PATH ?? '');
  const dataSource = createDataSource();

  if (!basePath) throw new Error('SFTP_PATH is required');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }

  await dataSource.initialize();

  let sftp: Client | null = null;
  let planned = 0;
  let migrated = 0;
  let skipped = 0;
  let conflicts = 0;

  try {
    const plans: ResourcePlan[] = [];

    for (const type of types) {
      const rows = await fetchRows(dataSource, type, limit);
      for (const row of rows) {
        const plan = createPlan(type, row, basePath);
        if (plan) plans.push(plan);
      }
    }

    const sharedPaths = findSharedPaths(plans);
    if (write) sftp = await connectSftp();

    for (const plan of plans) {
      const sharedPath = plan.moves.find((move) =>
        sharedPaths.has(move.oldPath),
      );
      if (sharedPath) {
        conflicts += 1;
        console.warn(`[shared] ${plan.type}#${plan.id}: ${sharedPath.oldPath}`);
        continue;
      }

      planned += plan.moves.length;
      console.log(`[plan] ${plan.type}#${plan.id}`);
      for (const move of plan.moves) {
        console.log(`  ${move.oldPath}`);
        console.log(`  -> ${move.newPath}`);
      }

      if (write && sftp) {
        const applied = await applyPlan(dataSource, sftp, plan);
        if (applied) migrated += plan.moves.length;
        else skipped += plan.moves.length;
      }
    }
  } finally {
    if (sftp) await sftp.end();
    await dataSource.destroy();
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        planned,
        migrated,
        skipped,
        conflicts,
      },
      null,
      2,
    ),
  );

  if (!write) {
    console.log('Run with --write to move files and update resource content.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
