import 'reflect-metadata';
import Client from 'ssh2-sftp-client';
import { readFileSync } from 'fs';
import { join, posix } from 'path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

type AttachmentType = 'issue' | 'report' | 'document';

type AttachmentRow = {
  id: number;
  path: string;
  resourceId: number;
};

type PlannedMove = {
  type: AttachmentType;
  table: string;
  id: number;
  oldPath: string;
  newPath: string;
};

const attachmentConfigs: Record<
  AttachmentType,
  { table: string; resourceColumn: string }
> = {
  issue: { table: 'issue_attachment', resourceColumn: 'issue_id' },
  report: { table: 'report_attachment', resourceColumn: 'report_id' },
  document: { table: 'document_attachment', resourceColumn: 'document_id' },
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
  if (!rawTypes) return Object.keys(attachmentConfigs) as AttachmentType[];

  const types = rawTypes.split(',').map((type) => type.trim());
  const invalid = types.find((type) => !(type in attachmentConfigs));

  if (invalid) {
    throw new Error(`Invalid attachment type: ${invalid}`);
  }

  return types as AttachmentType[];
}

function normalizeBasePath(value: string) {
  return value.trim().replace(/\/+$/g, '');
}

function buildNewPath(type: AttachmentType, oldPath: string, resourceId: number) {
  const basePath = normalizeBasePath(process.env.SFTP_PATH ?? '');
  const prefix = `${basePath}/attachments/${type}`;

  if (!oldPath.startsWith(`${prefix}/`)) {
    return null;
  }

  const relativePath = oldPath.slice(prefix.length + 1);
  const parts = relativePath.split('/').filter(Boolean);

  if (parts.length < 4) {
    return null;
  }

  const [, ...rest] = parts;

  return `${prefix}/${resourceId}/${rest.join('/')}`;
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
  type: AttachmentType,
  limit?: number,
) {
  const { table, resourceColumn } = attachmentConfigs[type];

  const rows = await dataSource.query(
    `
      SELECT id, path, ${resourceColumn} AS "resourceId"
      FROM ${table}
      WHERE deleted_at IS NULL
      ORDER BY id ASC
      ${limit ? `LIMIT ${limit}` : ''}
    `,
  );

  return rows as AttachmentRow[];
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

async function applyMove(
  dataSource: DataSource,
  sftp: Client,
  move: PlannedMove,
) {
  const oldExists = await sftp.exists(move.oldPath);
  if (!oldExists) {
    console.warn(`[missing] ${move.type}#${move.id}: ${move.oldPath}`);
    return false;
  }

  const newExists = await sftp.exists(move.newPath);
  if (newExists) {
    console.warn(`[exists] ${move.type}#${move.id}: ${move.newPath}`);
    return false;
  }

  await sftp.mkdir(posix.dirname(move.newPath), true);
  await sftp.rename(move.oldPath, move.newPath);

  try {
    await dataSource.query(`UPDATE ${move.table} SET path = $1 WHERE id = $2`, [
      move.newPath,
      move.id,
    ]);
  } catch (err) {
    try {
      await sftp.rename(move.newPath, move.oldPath);
    } catch (rollbackErr) {
      console.error(
        `[rollback_failed] ${move.type}#${move.id}: ${move.newPath}`,
        rollbackErr,
      );
    }

    throw err;
  }

  return true;
}

async function main() {
  const write = hasArg('--write');
  const limitValue = getArgValue('--limit');
  const limit = limitValue ? parseInt(limitValue, 10) : undefined;
  const types = getTypes();
  const dataSource = createDataSource();

  if (!process.env.SFTP_PATH) {
    throw new Error('SFTP_PATH is required');
  }

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }

  await dataSource.initialize();

  let sftp: Client | null = null;
  let planned = 0;
  let moved = 0;
  let skipped = 0;

  try {
    if (write) {
      sftp = await connectSftp();
    }

    for (const type of types) {
      const { table } = attachmentConfigs[type];
      const rows = await fetchRows(dataSource, type, limit);

      for (const row of rows) {
        const newPath = buildNewPath(type, row.path, row.resourceId);

        if (!newPath || newPath === row.path) {
          skipped += 1;
          continue;
        }

        const move: PlannedMove = {
          type,
          table,
          id: row.id,
          oldPath: row.path,
          newPath,
        };

        planned += 1;
        console.log(`[plan] ${type}#${row.id}`);
        console.log(`  ${move.oldPath}`);
        console.log(`  -> ${move.newPath}`);

        if (write && sftp) {
          const didMove = await applyMove(dataSource, sftp, move);
          if (didMove) moved += 1;
        }
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
        moved,
        skipped,
      },
      null,
      2,
    ),
  );

  if (!write) {
    console.log('Run with --write to move files and update DB paths.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
