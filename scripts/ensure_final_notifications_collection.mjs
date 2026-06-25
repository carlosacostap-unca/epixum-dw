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

const dateField = (name) => ({
  type: 'date',
  name,
  required: false,
  presentable: false,
  hidden: false,
  min: '',
  max: '',
});

const selectField = (name, values, required = false) => ({
  type: 'select',
  name,
  required,
  presentable: false,
  hidden: false,
  values,
  maxSelect: 1,
});

const relationField = (name, collectionId, required = false, cascadeDelete = false) => ({
  type: 'relation',
  name,
  required,
  presentable: false,
  hidden: false,
  collectionId,
  cascadeDelete,
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
const threadAccess = `${teacherOrAdmin} || student = @request.auth.id`;
const messageAccess = `${teacherOrAdmin} || (student = @request.auth.id && thread.student = @request.auth.id)`;
const threadIndexes = [
  'CREATE INDEX `idx_final_notification_threads_student` ON `final_notification_threads` (`student`)',
  'CREATE INDEX `idx_final_notification_threads_lastMessageAt` ON `final_notification_threads` (`lastMessageAt`)',
];
const messageIndexes = [
  'CREATE INDEX `idx_final_notification_messages_thread` ON `final_notification_messages` (`thread`)',
  'CREATE INDEX `idx_final_notification_messages_student` ON `final_notification_messages` (`student`)',
];

await ensureCollection(pb, {
  name: 'final_notification_threads',
  type: 'base',
  listRule: threadAccess,
  viewRule: threadAccess,
  createRule: teacherOrAdmin,
  updateRule: threadAccess,
  deleteRule: teacherOrAdmin,
  fields: [
    relationField('student', usersCollection.id, true, true),
    textField('subject', true),
    selectField('status', ['open', 'archived'], true),
    relationField('createdBy', usersCollection.id, true),
    dateField('lastMessageAt'),
    dateField('teacherReadAt'),
    dateField('studentReadAt'),
  ],
  indexes: threadIndexes,
});

const threadsCollection = await collectionExists(pb, 'final_notification_threads');
if (!threadsCollection) {
  throw new Error('Missing final_notification_threads collection.');
}

await ensureCollection(pb, {
  name: 'final_notification_messages',
  type: 'base',
  listRule: messageAccess,
  viewRule: messageAccess,
  createRule: messageAccess,
  updateRule: null,
  deleteRule: teacherOrAdmin,
  fields: [
    relationField('thread', threadsCollection.id, true, true),
    relationField('student', usersCollection.id, true, true),
    relationField('author', usersCollection.id, true),
    textField('content', true),
  ],
  indexes: messageIndexes,
});

await ensureCollectionRules(pb, 'final_notification_threads', {
  listRule: threadAccess,
  viewRule: threadAccess,
  createRule: teacherOrAdmin,
  updateRule: threadAccess,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'final_notification_threads', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'student')) {
    nextFields.push(relationField('student', usersCollection.id, true, true));
  }
  if (!nextFields.some((field) => field.name === 'subject')) {
    nextFields.push(textField('subject', true));
  }
  if (!nextFields.some((field) => field.name === 'status')) {
    nextFields.push(selectField('status', ['open', 'archived'], true));
  }
  if (!nextFields.some((field) => field.name === 'createdBy')) {
    nextFields.push(relationField('createdBy', usersCollection.id, true));
  }
  if (!nextFields.some((field) => field.name === 'lastMessageAt')) {
    nextFields.push(dateField('lastMessageAt'));
  }
  if (!nextFields.some((field) => field.name === 'teacherReadAt')) {
    nextFields.push(dateField('teacherReadAt'));
  }
  if (!nextFields.some((field) => field.name === 'studentReadAt')) {
    nextFields.push(dateField('studentReadAt'));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'final_notification_threads', threadIndexes);

await ensureCollectionRules(pb, 'final_notification_messages', {
  listRule: messageAccess,
  viewRule: messageAccess,
  createRule: messageAccess,
  updateRule: null,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'final_notification_messages', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'thread')) {
    nextFields.push(relationField('thread', threadsCollection.id, true, true));
  }
  if (!nextFields.some((field) => field.name === 'student')) {
    nextFields.push(relationField('student', usersCollection.id, true, true));
  }
  if (!nextFields.some((field) => field.name === 'author')) {
    nextFields.push(relationField('author', usersCollection.id, true));
  }
  if (!nextFields.some((field) => field.name === 'content')) {
    nextFields.push(textField('content', true));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'final_notification_messages', messageIndexes);

console.log('Final notification collections are ready.');
