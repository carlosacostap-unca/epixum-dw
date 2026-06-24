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

const relationField = (name, collectionId, required = false) => ({
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
if (!usersCollection) {
  throw new Error('Missing users collection.');
}

const teacherOrAdmin = '@request.auth.role = "docente" || @request.auth.role = "admin"';
const indexes = [
  'CREATE INDEX `idx_external_siu_students_fullName` ON `external_siu_students` (`fullName`)',
  'CREATE UNIQUE INDEX `idx_external_siu_students_dni` ON `external_siu_students` (`dni`) WHERE `dni` != ""',
  'CREATE UNIQUE INDEX `idx_external_siu_students_email` ON `external_siu_students` (`email`) WHERE `email` != ""',
  'CREATE UNIQUE INDEX `idx_external_siu_students_enrollmentId` ON `external_siu_students` (`enrollmentId`) WHERE `enrollmentId` != ""',
];

await ensureCollection(pb, {
  name: 'external_siu_students',
  type: 'base',
  listRule: teacherOrAdmin,
  viewRule: teacherOrAdmin,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
  fields: [
    textField('fullName', true),
    textField('email'),
    textField('dni'),
    textField('enrollmentId'),
    textField('notes'),
    relationField('createdBy', usersCollection.id),
  ],
  indexes,
});

await ensureCollectionRules(pb, 'external_siu_students', {
  listRule: teacherOrAdmin,
  viewRule: teacherOrAdmin,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'external_siu_students', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'fullName')) {
    nextFields.push(textField('fullName', true));
  }
  if (!nextFields.some((field) => field.name === 'email')) {
    nextFields.push(textField('email'));
  }
  if (!nextFields.some((field) => field.name === 'dni')) {
    nextFields.push(textField('dni'));
  }
  if (!nextFields.some((field) => field.name === 'enrollmentId')) {
    nextFields.push(textField('enrollmentId'));
  }
  if (!nextFields.some((field) => field.name === 'notes')) {
    nextFields.push(textField('notes'));
  }
  if (!nextFields.some((field) => field.name === 'createdBy')) {
    nextFields.push(relationField('createdBy', usersCollection.id));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'external_siu_students', indexes);

console.log('External SIU students collection is ready.');
