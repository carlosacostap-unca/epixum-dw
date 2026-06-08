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

const relationField = (name, collectionId, required = true) => ({
  type: 'relation',
  name,
  required,
  presentable: false,
  hidden: false,
  collectionId,
  cascadeDelete: false,
  minSelect: required ? 1 : 0,
  maxSelect: 1,
});

const textField = (name) => ({
  type: 'text',
  name,
  required: false,
  presentable: false,
  hidden: false,
  min: 0,
  max: 0,
  pattern: '',
  autogeneratePattern: '',
});

const dateField = (name, required = false) => ({
  type: 'date',
  name,
  required,
  presentable: false,
  hidden: false,
  min: '',
  max: '',
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

const usersCollection = await collectionExists(pb, 'users');
const teamsCollection = await collectionExists(pb, 'teams');

if (!usersCollection || !teamsCollection) {
  throw new Error('Missing users or teams collection.');
}

const teacherOrAdmin = '@request.auth.role = "docente" || @request.auth.role = "admin"';
const teacherAdminOrOwnStudent =
  `${teacherOrAdmin} || (@request.auth.role = "estudiante" && student = @request.auth.id)`;
const ownStudentCreate = '@request.auth.role = "estudiante" && student = @request.auth.id';
const indexes = [
  'CREATE UNIQUE INDEX `idx_team_validation_student` ON `team_validation_responses` (`student`)',
  'CREATE INDEX `idx_team_validation_team` ON `team_validation_responses` (`team`)',
  'CREATE INDEX `idx_team_validation_status` ON `team_validation_responses` (`status`)',
];

await ensureCollection(pb, {
  name: 'team_validation_responses',
  type: 'base',
  listRule: teacherAdminOrOwnStudent,
  viewRule: teacherAdminOrOwnStudent,
  createRule: ownStudentCreate,
  updateRule: teacherAdminOrOwnStudent,
  deleteRule: teacherOrAdmin,
  fields: [
    relationField('student', usersCollection.id),
    relationField('team', teamsCollection.id, false),
    {
      type: 'select',
      name: 'status',
      required: true,
      presentable: false,
      hidden: false,
      maxSelect: 1,
      values: ['correct', 'wrong_team', 'missing_member', 'extra_member', 'no_team', 'other'],
    },
    textField('details'),
    dateField('submittedAt', true),
    dateField('resolvedAt'),
    relationField('resolvedBy', usersCollection.id, false),
  ],
  indexes,
});

await ensureCollectionRules(pb, 'team_validation_responses', {
  listRule: teacherAdminOrOwnStudent,
  viewRule: teacherAdminOrOwnStudent,
  createRule: ownStudentCreate,
  updateRule: teacherAdminOrOwnStudent,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'team_validation_responses', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'resolvedAt')) {
    nextFields.push(dateField('resolvedAt'));
  }
  if (!nextFields.some((field) => field.name === 'resolvedBy')) {
    nextFields.push(relationField('resolvedBy', usersCollection.id, false));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'team_validation_responses', indexes);

console.log('Team validation collection is ready.');
