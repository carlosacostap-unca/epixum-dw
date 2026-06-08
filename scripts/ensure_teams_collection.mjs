import fs from 'node:fs';
import path from 'node:path';
import PocketBase from 'pocketbase';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function collectionExists(pb, name) {
  try {
    return await pb.collections.getOne(name);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function ensureCollection(pb, schema) {
  const existing = await collectionExists(pb, schema.name);
  if (existing) {
    console.log(`${schema.name} already exists`);
    return existing;
  }

  const created = await pb.collections.create(schema);
  console.log(`created ${created.name} ${created.id}`);
  return created;
}

async function ensureCollectionFields(pb, name, updateFields) {
  const collection = await collectionExists(pb, name);
  if (!collection) return null;

  const fields = updateFields(collection.fields);
  const changed = JSON.stringify(fields) !== JSON.stringify(collection.fields);
  if (!changed) {
    console.log(`${name} fields already up to date`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, { fields });
  console.log(`updated ${name} fields`);
  return updated;
}

async function ensureCollectionRules(pb, name, rules) {
  const collection = await collectionExists(pb, name);
  if (!collection) return null;

  const needsUpdate = Object.entries(rules).some(([key, value]) => collection[key] !== value);
  if (!needsUpdate) {
    console.log(`${name} rules already up to date`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, rules);
  console.log(`updated ${name} rules`);
  return updated;
}

async function ensureCollectionIndexes(pb, name, indexes) {
  const collection = await collectionExists(pb, name);
  if (!collection) return null;

  const existingIndexes = collection.indexes || [];
  const missingIndexes = indexes.filter((index) => !existingIndexes.includes(index));
  if (missingIndexes.length === 0) {
    console.log(`${name} indexes already up to date`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, {
    indexes: [...existingIndexes, ...missingIndexes],
  });
  console.log(`updated ${name} indexes`);
  return updated;
}

const textField = (name, required = false) => ({
  type: 'text',
  name,
  required,
  presentable: false,
  hidden: false,
  min: 0,
  max: 0,
  pattern: '',
  autogeneratePattern: '',
});

const relationField = (name, collectionId, maxSelect = 1, cascadeDelete = false) => ({
  type: 'relation',
  name,
  required: true,
  presentable: false,
  hidden: false,
  collectionId,
  cascadeDelete,
  minSelect: 1,
  maxSelect,
});

loadEnvFile(path.join(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_ADMIN;
const password = process.env.POCKETBASE_PASSWORD;

if (!url || !email || !password) {
  throw new Error('Missing PocketBase environment variables.');
}

const pb = new PocketBase(url);
pb.autoCancellation(false);

try {
  await pb.collection('_superusers').authWithPassword(email, password);
} catch {
  await pb.admins.authWithPassword(email, password);
}

const teacherOrAdmin = '@request.auth.role = "docente" || @request.auth.role = "admin"';
const teacherAdminOrStudent = `${teacherOrAdmin} || @request.auth.role = "estudiante"`;
const usersCollection = await collectionExists(pb, 'users');

if (!usersCollection) {
  throw new Error('Missing users collection.');
}

const teamsCollection = await ensureCollection(pb, {
  name: 'teams',
  type: 'base',
  listRule: teacherAdminOrStudent,
  viewRule: teacherAdminOrStudent,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
  fields: [
    textField('name', true),
    textField('description'),
  ],
  indexes: [
    'CREATE UNIQUE INDEX `idx_teams_name` ON `teams` (`name`)',
  ],
});

await ensureCollectionRules(pb, 'teams', {
  listRule: teacherAdminOrStudent,
  viewRule: teacherAdminOrStudent,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'teams', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'name')) {
    nextFields.push(textField('name', true));
  }
  if (!nextFields.some((field) => field.name === 'description')) {
    nextFields.push(textField('description'));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'teams', [
  'CREATE UNIQUE INDEX `idx_teams_name` ON `teams` (`name`)',
]);

await ensureCollection(pb, {
  name: 'team_members',
  type: 'base',
  listRule: teacherAdminOrStudent,
  viewRule: teacherAdminOrStudent,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
  fields: [
    relationField('team', teamsCollection.id, 1, true),
    relationField('student', usersCollection.id, 1),
  ],
  indexes: [
    'CREATE UNIQUE INDEX `idx_team_members_student` ON `team_members` (`student`)',
    'CREATE INDEX `idx_team_members_team` ON `team_members` (`team`)',
  ],
});

await ensureCollectionRules(pb, 'team_members', {
  listRule: teacherAdminOrStudent,
  viewRule: teacherAdminOrStudent,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'team_members', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'team')) {
    nextFields.push(relationField('team', teamsCollection.id, 1, true));
  }
  if (!nextFields.some((field) => field.name === 'student')) {
    nextFields.push(relationField('student', usersCollection.id, 1));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'team_members', [
  'CREATE UNIQUE INDEX `idx_team_members_student` ON `team_members` (`student`)',
  'CREATE INDEX `idx_team_members_team` ON `team_members` (`team`)',
]);

console.log('Teams collections are ready.');
